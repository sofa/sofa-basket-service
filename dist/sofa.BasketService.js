/**
 * sofa-basket-service - v0.2.2 - 2014-06-17
 * http://www.sofa.io
 *
 * Copyright (c) 2014 CouchCommerce GmbH (http://www.couchcommerce.com / http://www.sofa.io) and other contributors
 * THIS SOFTWARE CONTAINS COMPONENTS OF THE SOFA.IO COUCHCOMMERCE SDK (WWW.SOFA.IO).
 * IT IS PROVIDED UNDER THE LICENSE TERMS OF THE ATTACHED LICENSE.TXT.
 */
;(function (sofa, undefined) {

'use strict';
/* global sofa */
/**
 * @name BasketService
 * @class
 * @namespace sofa.BasketService
 *
 * @description
 * `sofa.BasketService` is the interface to interact with a shopping cart. It provides
 * methods to add, remove or update basket items. It also takes care of writing
 * updates to an available storage service.
 */
sofa.define('sofa.BasketService', function (storageService, configService, options) {

    var self = {},
        storePrefix = 'basketService_',
        storeItemsName = storePrefix + 'items',
        storeCouponsName = storePrefix + 'coupons',
        items = sanitizeSavedData(storageService.get(storeItemsName)) || [],
        activeCoupons = sanitizeSavedData(storageService.get(storeCouponsName)) || [],
        productIdentityFn = options && cc.Util.isFunction(options.productIdentityFn) ?
            options.productIdentityFn : function (productA, productAVariant, productB, productBVariant) {

                var productAVariantID = productAVariant && productAVariant.variantID,
                    productBVariantID = productBVariant && productBVariant.variantID,
                    productAOptionID  = productAVariant && productAVariant.optionID,
                    productBOptionID  = productBVariant && productBVariant.optionID;

                return productA.id === productB.id &&
                       productAVariantID === productBVariantID &&
                       productAOptionID === productBOptionID;
            };


    var SHIPPING_COST       = configService.get('shippingCost'),
        SHIPPING_TAX        = configService.get('shippingTax'),
        FREE_SHIPPING_FROM  = configService.get('freeShippingFrom');


    //allow this service to raise events
    sofa.observable.mixin(self);

    //http://mutablethought.com/2013/04/25/angular-js-ng-repeat-no-longer-allowing-duplicates/
    function sanitizeSavedData(data) {
        if (!data) {
            return data;
        }

        return data.map(function (val) {
            delete val.$$hashKey;

            //on serialization all functions go away. That means, we basically
            //have to create a fresh instance again, once we deserialize again
            var item = sofa.Util.extend(new sofa.models.BasketItem(), val);

            if (item.product) {
                item.product = sofa.Util.extend(new sofa.models.Product(), item.product);
            }

            return item;
        });
    }

    var writeToStore = function () {
        storageService.set(storeItemsName, items);
        storageService.set(storeCouponsName, activeCoupons);
    };

    writeToStore();

    /**
     * @method addItem
     * @memberof sofa.BasketService
     *
     * @description
     * Adds an item to the basket. Returns the added basket item.
     *
     * @example
     * basketService.addItem(product, 1, variants.selectedVariant);
     *
     * @param {object} product The product object itself.
     * @param {number} quantity The number of times the product should be added.
     * @param {object} variant The variant the product should be added with.
     * @param {int} optionId The optionId the product should be added with.
     *
     * @return {object} The added basket item.
     */
    self.addItem = function (product, quantity, variant) {

        if (product.isOutOfStock()) {
            throw new Error('product out of stock');
        }

        if (!canHandleQuantity(product, quantity, variant)) {
            throw new Error('exceeds available stock');
        }

        var basketItem = self.find(createProductPredicate(product, variant)),
            exists = !sofa.Util.isUndefined(basketItem);

        if (!exists) {
            basketItem = new sofa.models.BasketItem();
            items.push(basketItem);
        }

        basketItem.product = product;
        basketItem.quantity = basketItem.quantity + quantity;
        basketItem.variant = variant;

        if (!product.hasInfiniteStock() && !variant) {
            product.qty = product.qty - quantity;
        }
        else if (variant !== null && cc.Util.isObject(variant) && cc.Util.isNumeric(variant.stock)) {
            variant.stock = variant.stock - quantity;
        }

        writeToStore();

        self.emit('itemAdded', self, basketItem);

        return basketItem;
    };

    /**
    * @method canBeIncreasedBy
    * @memberof sofa.BasketService
    *
    * @description
    * Checks for a given basketItem if it can be increased by a specified amount.
    *
    * @example
    * basketService.canBeIncreasedBy(basketItem, 1);
    *
    * @param {object} basketItem used for the check.
    * @param {number} quantity to be checked against.
    *
    * @return {boolean} returns true if the item amount can be increased.
    */
    self.canBeIncreasedBy = function (basketItem, amount) {
        return canHandleQuantity(basketItem.product, amount, basketItem.variant);
    };

    var canHandleQuantity = function (product, quantity, variant) {

        // variants without stock will use the stock rules of the product
        if (!variant || !cc.Util.isNumeric(variant.stock)) {
            return product.hasInfiniteStock() || (product.qty - quantity >= 0);
        }
        else {
            return variant.stock - quantity >= 0;
        }

        return true;
    };

    /**
     * @method addCoupon
     * @memberof cc.BasketService
     *
     * @description
     * Adds a coupon to the basket.
     *
     * @example
     * basketService.addCoupon(couponData);
     *
     * @param {object} couponData An object which contains coupon metadata such as name, amount and description.
     */
    self.addCoupon = function (couponData) {
        var foundCoupon = cc.Util.find(activeCoupons, function (activeCoupon) {
            return activeCoupon.code === couponData.code;
        });

        if (!foundCoupon) {
            activeCoupons.push(couponData);
            writeToStore();

            self.emit('couponAdded', self, couponData);
        }
    };

    /**
     * @method removeCoupon
     * @memberof cc.BasketService
     *
     * @description
     * Removes a coupon which is currently active in the basket.
     *
     * @example
     * basketService.removeCoupon(couponCode);
     *
     * @param {object} couponCode The code of the coupon to remove
     */
    self.removeCoupon = function (couponCode) {
        var couponToBeRemoved = cc.Util.find(activeCoupons, function (activeCoupon) {
            return activeCoupon.code === couponCode;
        });
        cc.Util.Array.remove(activeCoupons, couponToBeRemoved);

        writeToStore();

        self.emit('couponRemoved', self, couponToBeRemoved);
    };

    /**
     * @method getActiveCoupons
     * @memberof cc.BasketService
     *
     * @description
     * Gets the coupons which are currently active in the basket.
     *
     * @example
     * basketService.getActiveCoupons();
     *
     * @return {object} basketItem An array of objects that contain coupon data
     */
    self.getActiveCoupons = function () {
        return activeCoupons;
    };

    /**
     * @method increaseOne
     * @memberof sofa.BasketService
     *
     * @description
     * This is actually a shorthand for {@link sofa.BasketService#increase sofa.BasketService.increase}. It increases the amount of given basket item by one.
     *
     * @example
     * sofa.BasketService.increaseOne(basketItem);
     * // is equivalent to
     * sofa.BasketService.increase(basketItem, 1);
     *
     * @param {object} basketItem The basketItem that should be increased by one.
     *
     * @return {object} basketItem Updated basket item.
     */
    self.increaseOne = function (basketItem) {
        return self.increase(basketItem, 1);
    };

    /**
     * @method increase
     * @memberof sofa.BasketService
     *
     * @description
     * Increases the quantity of a given basket item by a given value. Increases
     * by one should be done with {@link sofa.BasketService#increaseOne sofa.BasketService.increaseOne}.
     *
     * Behind the scenes, this method is actually a shorthand for
     * `basketService.addItem()` with a particular configuration. Therefore this
     * method returns the updated basket item for post processing.
     *
     * @example
     * // getting an item
     * var item = / *** /;
     * // update item
     * item = basetService.increase(item, 3);
     *
     * @param {object} basketItem Basket item to increase.
     * @param {number} number Number to increase.
     *
     * @return {object} Updated basket item.
     */
    self.increase = function (basketItem, number) {
        return self.addItem(basketItem.product, number, basketItem.variant);
    };

    /**
     * @method exists
     * @memberof sofa.BasketService
     *
     * @description
     * Checks if an product exists in the basket. You have to pass the product to
     * check for. Optionally you can pass a product variant and an option id.
     * Returns `true` or `false` accordingly.
     *
     * @example
     * if (basketService.exists(productX, variantA, optionB)) {
     *  // do sth. with it.
     * }
     *
     * @param {object} product The Product object itself.
     * @param {object} variant The variant the basket should be checked for.
     * @param {int} The optionId the basket should be checked for.
     *
     * @return {bool} True whether the product exists or not.
     */
    self.exists = function (product, variant) {
        var basketItem = self.find(createProductPredicate(product, variant));
        return !sofa.Util.isUndefined(basketItem);
    };

    var createProductPredicate = function (productA, productAVariant) {
        return function (item) {
            return productIdentityFn(productA, productAVariant, item.product, item.variant);
        };
    };

    /**
     * @method removeItem
     * @memberof sofa.BasketService
     *
     * @description
     * Removes an item from the basket.
     *
     * @example
     * basketService.removeItem(product, 1, foo, 3);
     *
     * @param {object} product The Product that should be removed from the basket.
     * @param {number} quantity The quantity that should be removed from the basket.
     * @param {object} variant The variant that should be removed from the basket.
     *
     * @return {object} Removed basket item.
     */
    self.removeItem = function (product, quantity, variant) {
        var basketItem = self.find(createProductPredicate(product, variant));

        if (!basketItem) {
            throw new Error('Product id: ' + product.id +
                ' , variant: ' + variant +
                '  does not exist in the basket');
        }

        if (basketItem.quantity < quantity) {
            throw new Error('remove quantity is higher than existing quantity');
        }

        basketItem.quantity = basketItem.quantity - quantity;

        if (basketItem.quantity === 0) {
            sofa.Util.Array.remove(items, basketItem);
        }

        // give the stock back to the product
        if (!product.hasInfiniteStock() && !variant) {
            product.qty = product.qty + quantity;
        }
        else if (cc.Util.isObject(variant) && cc.Util.isNumeric(variant.stock)) {
            variant.stock = variant.stock + quantity;
        }

        writeToStore();

        self.emit('itemRemoved', self, basketItem);

        return basketItem;
    };

    /**
     * @method decreaseOne
     * @memberof sofa.BasketService
     *
     * @description
     * Decreases the quantity of a given basket item by one. This is a shorthand
     * method for {@link sofa.BasketService#decrease sofa.BasketService.decrease} and
     * returns the updated basket item.
     *
     * @example
     * var updatedItem = basketService.decreaseOne(item);
     *
     * @param {object} basketItem The basket item that should be decreased by one
     *
     * @return {object} The updated basket item.
     */
    self.decreaseOne = function (basketItem) {
        return self.decrease(basketItem, 1);
    };

    /**
     * @method decrease
     * @memberof sofa.BasketService
     *
     * @description
     * Decreases that quantity of a given basket item by a given number. This is
     * shorthand method for {@link sofa.BasketService#removeItem sofa.BasketItem.removeItem}
     * and therefore returns the updated basket item.
     *
     * @example
     * var item = basketItem.decrease(item, 2);
     *
     * @param {object} basketItem The basketItem that should be decreased by one.
     * @param {number} number Number to decrease.
     *
     * @return {object} Updated basket item.
     */
    self.decrease = function (basketItem, number) {
        return self.removeItem(basketItem.product, number, basketItem.variant);
    };

    /**
     * @method clear
     * @memberof sofa.BasketService
     *
     * @description
     * Removes all items from the basket.
     *
     * @example
     * basketService.clear();
     *
     * @return {object} BasketService instance for method chaining.
     */
    self.clear = function () {

        items.length = 0;
        activeCoupons.length = 0;

        writeToStore();

        self.emit('cleared', self);

        //return self for chaining
        return self;
    };

    /**
     * @method clearCoupons
     * @memberof cc.BasketService
     *
     * @description
     * Removes all active coupons from the basket.
     *
     * @example
     * basketService.clearCoupons();
     *
     * @return {object} BasketService instance for method chaining.
     */
    self.clearCoupons = function () {

        activeCoupons.length = 0;

        writeToStore();

        self.emit('clearedCoupons', self);

        //return self for chaining
        return self;
    };

    /**
     * @method find
     * @memberof sofa.BasketService
     *
     * @description
     * Finds a basket item by the given predicate function.
     *
     * @example
     * var needle = basketService.find(function () [
     *
     * });
     *
     * @param {function} predicate Function to test the basketItem against.
     *
     * @return {object} Found basket item.
     */
    self.find = function (predicate) {
        return sofa.Util.find(items, predicate);
    };


    /**
     * @method getItems
     * @memberof sofa.BasketService
     *
     * @description
     * Returns all basket items.
     *
     * @example
     * var items = basketItem.getItems();
     *
     * @return {array} Basket items.
     */
    self.getItems = function () {
        return items;
    };

    /**
     * @method isEmpty
     * @memberof cc.BasketService
     *
     * @description
     * Returns true if the basket is Empty.
     *
     * @return {boolean} empty state.
     */
    self.isEmpty = function () {
        return items.length === 0;
    };

    /**
     * @method getSummary
     * @memberof sofa.BasketService
     *
     * @description
     * Returns a summary object of the current basket state.
     *
     * @param {object} options Options object.
     *
     * @return {object} Summary object.
     */
    self.getSummary = function (options) {
        var shipping             = SHIPPING_COST || 0,
            shippingTax          = SHIPPING_TAX,
            freeShippingFrom     = FREE_SHIPPING_FROM,
            quantity             = 0,
            sum                  = 0,
            vat                  = 0,
            discount             = 0,
            /* jshint camelcase: false */
            surcharge            =  options && options.paymentMethod &&
                                    sofa.Util.isNumber(options.paymentMethod.surcharge) ?
                                    options.paymentMethod.surcharge : 0,
            surcharge_percentage =  options && options.paymentMethod &&
                                    sofa.Util.isNumber(options.paymentMethod.surcharge_percentage) ?
                                    options.paymentMethod.surcharge_percentage : 0,
            total                = 0;


        var getVat = function (price, tax, quantity) {
            return parseFloat(Math.round((price * tax / (100 + tax)) * 100) / 100) * quantity;
        };

            /* jshint camelcase: true */
        items.forEach(function (item) {
            var itemQuantity = parseInt(item.quantity, 10);
            var product = item.product;
            var price = item.getPrice();
            var tax = parseInt(product.tax, 10);
            quantity += itemQuantity;
            sum += price * itemQuantity;
            vat += getVat(price, tax, itemQuantity);
        });
        //set the shipping to zero if the sum is above the configured free shipping value
        shipping = freeShippingFrom !== null && freeShippingFrom !== undefined && sum >= freeShippingFrom ? 0 : shipping;

        //if a valid shipping method is provided, use the price and completely ignore
        //the freeShippingFrom config as it's the backend's responsability to check that.
        if (options && options.shippingMethod && sofa.Util.isNumber(options.shippingMethod.price)) {
            shipping = options.shippingMethod.price;
        }

        total = sum + discount;

        /* jshint camelcase: false */
        if (surcharge_percentage) {
            surcharge = total * (surcharge_percentage / 100.0);
        }
        /* jshint camelcase: true */

        total += shipping + surcharge;

        // For each coupon, subtract the discount value
        activeCoupons.forEach(function (coupon) {
            total -= parseFloat(coupon.amount);
            //hardcode the coupon tax to 19 percent if it's not given for the coupon
            coupon.tax = sofa.Util.isNumeric(coupon.tax) ? coupon.tax : 19;
            vat -= getVat(coupon.amount, coupon.tax, 1);
        });

        vat += getVat(shipping, shippingTax, 1);

        var summary = {
            quantity: quantity,
            sum: sum,
            sumStr: sum.toFixed(2),
            vat: vat,
            vatStr: vat.toFixed(2),
            shipping: shipping,
            shippingStr: shipping.toFixed(2),
            surcharge: surcharge,
            surchargeStr: surcharge.toFixed(2),
            discount: discount,
            total: total,
            totalStr: total.toFixed(2),
            shippingTax: shippingTax
        };

        return summary;
    };
    return self;
});

}(sofa));

'use strict';
/* global sofa */

describe('sofa.basketService', function () {

    var basketService, storageService, configService;

    beforeEach(function () {
        storageService = new sofa.MemoryStorageService();
        configService = new sofa.ConfigService();
        basketService = new sofa.BasketService(storageService, configService);
    });

    it('should be defined', function () {
        expect(basketService).toBeDefined();
    });

    it('should be an object', function () {
        expect(typeof basketService).toBe('object');
    });

    it('should have a method addItem', function () {
        expect(basketService.addItem).toBeDefined();
    });

    it('should have a method increaseOne', function () {
        expect(basketService.increaseOne).toBeDefined();
    });

    it('should have a method increase', function () {
        expect(basketService.increase).toBeDefined();
    });

    it('should have a method exists', function () {
        expect(basketService.exists).toBeDefined();
    });

    it('should have a method removeItem', function () {
        expect(basketService.removeItem).toBeDefined();
    });

    it('should have a method decreaseOne', function () {
        expect(basketService.decreaseOne).toBeDefined();
    });

    it('should have a method decrease', function () {
        expect(basketService.decrease).toBeDefined();
    });

    it('should have a method', function () {
        expect(basketService.clear).toBeDefined();
    });

    it('should have a method find', function () {
        expect(basketService.find).toBeDefined();
    });

    it('should have a method getItems', function () {
        expect(basketService.getItems).toBeDefined();
    });

    it('should have a method getSummary', function () {
        expect(basketService.getSummary).toBeDefined();
    });

    describe('sofa.BasketService#addItem', function () {

        var product;

        beforeEach(function () {
            basketService.clear();
            product = new sofa.models.Product();
        });

        it('should be a function', function () {
            expect(typeof basketService.addItem).toBe('function');
        });

        describe('when item added without variant', function () {
            it('should add an item', function () {
                product.name = 'Testproduct';
                product.id = 10;
                product.qty = 1;

                var basketItem = basketService.addItem(product, 1);
                var summary = basketService.getSummary();

                expect(summary.quantity).toBe(1);
                expect(basketItem.product).toEqual(product);
                expect(product.qty).toBe(0);
            });
        });

        describe('when item added without stock', function () {
            it('should throw exception', function () {
                product.name = 'Testproduct';
                product.id = 10;
                product.qty = 0;

                expect(function () {
                    basketService.addItem(product, 1);
                }).toThrowError('product out of stock');
            });
        });


        describe('when item added, then removed', function () {
            describe('without variant', function () {
                it('should remove entire basket item and free stock', function () {
                    product.name = 'Testproduct';
                    product.id = 10;
                    product.qty = 1;

                    var basketItem = basketService.addItem(product, 1);
                    var summary = basketService.getSummary();

                    expect(summary.quantity).toBe(1);
                    expect(basketItem.product).toEqual(product);
                    expect(product.qty).toBe(0);

                    var itemRemovedCalled = 0;
                    basketService.on('itemRemoved', function () {
                        summary = basketService.getSummary();
                        expect(summary.quantity).toBe(0);
                        expect(basketService.getItems().length).toBe(0);
                        expect(product.qty).toBe(1);
                        itemRemovedCalled++;
                    });

                    basketService.decreaseOne(basketItem);
                    expect(itemRemovedCalled).toBe(1);
                });
            });


            describe('with variant', function () {
                it('should remove entire basket item and free stock', function () {
                    product.name = 'Testproduct';
                    product.id = 10;

                    var variant = {
                        id: 1,
                        stock: 1
                    };

                    var basketItem = basketService.addItem(product, 1, variant);
                    var summary = basketService.getSummary();

                    expect(summary.quantity).toBe(1);
                    expect(basketItem.product).toEqual(product);
                    expect(variant.stock).toBe(0);

                    var itemRemovedCalled = 0;
                    basketService.on('itemRemoved', function () {
                        summary = basketService.getSummary();
                        expect(summary.quantity).toBe(0);
                        expect(basketService.getItems().length).toBe(0);
                        expect(variant.stock).toBe(1);
                        itemRemovedCalled++;
                    });

                    basketService.decreaseOne(basketItem);
                    expect(itemRemovedCalled).toBe(1);
                });
            });
        });

        // it('should add and remove basket item with variant', function () {
        //     product.name = 'Testproduct';
        //     product.id = 10;
        //     product.qty = 1;

        //     var basketItem = basketService.addItem(product, 1);
        //     var summary = basketService.getSummary();

        //     expect(summary.quantity).toBe(1);
        //     expect(basketItem.product).toEqual(product);
        //     expect(product.qty).toBe(0);

        //     var itemRemovedCalled = 0;
        //     basketService.on('itemRemoved', function () {
        //         summary = basketService.getSummary();
        //         expect(summary.quantity).toBe(0);
        //         expect(basketService.getItems().length).toBe(0);
        //         expect(product.qty).toBe(1);
        //         itemRemovedCalled++;
        //     });

        //     basketService.decreaseOne(basketItem);
        //     expect(itemRemovedCalled).toBe(1);
        // });
    });

    describe('sofa.BasketService#decrease', function () {

        var product;

        beforeEach(function () {
            basketService.clear();
            product = new sofa.models.Product();
        });

        it('should be a function', function () {
            expect(typeof basketService.decrease).toBe('function');
        });

        it('should use increase and decrease shorthands', function () {
            product.name = 'Testproduct';
            product.id = 10;

            var basketItem = basketService.addItem(product, 1);
            var summary = basketService.getSummary();

            expect(summary.quantity).toBe(1);
            expect(basketItem.product).toBe(product);
            expect(basketItem.quantity).toBe(1);

            basketService.increaseOne(basketItem);

            expect(summary.quantity).toBe(1);
            expect(basketItem.quantity).toBe(2);
        });
    });

    describe('sofa.BasketService#getSummary', function () {

        var product;

        beforeEach(function () {
            basketService.clear();
            product = new sofa.models.Product();
        });

        it('cumulate same product', function () {
            product.name = 'Testproduct';
            product.id = 10;
            product.price = 2;

            var itemAddedCalled = 0;

            basketService.on('itemAdded', function () { itemAddedCalled++; });

            var basketItem = basketService.addItem(product, 1);
            var basketItem2 = basketService.addItem(product, 1);
            var summary = basketService.getSummary();

            expect(itemAddedCalled).toBe(2);
            expect(summary.quantity).toBe(2);
            expect(basketService.exists(product)).toBe(true);
            expect(basketItem.product).toBe(product);
            expect(basketItem).toBe(basketItem2);
            expect(basketItem.quantity).toBe(2);
            expect(basketItem.getTotal()).toBe(4);
            expect(basketService.getItems().length).toBe(1);
        });

        it('should cumulate same products even after app reload without vairant', function () {
            product.name = 'Testproduct';
            product.id = 10;
            product.price = 2;

            var itemAddedCalled = 0;

            basketService.on('itemAdded', function () { itemAddedCalled++; });
            //we intentionally set variant to null here because
            //it has been a regression once that null values were not preserved
            //after reloading the app due to a bug in cc.Util.extend
            basketService.addItem(product, 1, null);

            var freshBasketService = new sofa.BasketService(storageService, configService);

            freshBasketService.on('itemAdded', function () { itemAddedCalled++; });
            var basketItem2 = freshBasketService.addItem(product, 1, null);
            var summary = freshBasketService.getSummary();

            expect(itemAddedCalled).toBe(2);
            expect(summary.quantity).toBe(2);
            expect(basketItem2.product).toBe(product);
            expect(basketItem2.quantity).toBe(2);
            expect(basketItem2.getTotal()).toBe(4);
            expect(freshBasketService.getItems().length).toBe(1);
        });

        it('should cumulate same products after app reload (with variant)', function () {
            product.name = 'Testproduct';
            product.id = 10;
            product.price = 2;

            var variant = {
                price: '2.00',
                variantID: 1,
                optionID: 1
            };

            var itemAddedCalled = 0;

            basketService.on('itemAdded', function () { itemAddedCalled++; });
            basketService.addItem(product, 1, variant);

            //we create a fresh basketService instance to mock the case that the
            //app was reloaded
            var freshBasketService = new sofa.BasketService(storageService, configService);
            freshBasketService.on('itemAdded', function () { itemAddedCalled++; });
            var basketItem2 = freshBasketService.addItem(product, 1, variant);
            var summary = freshBasketService.getSummary();

            expect(itemAddedCalled).toBe(2);
            expect(summary.quantity).toBe(2);
            expect(basketItem2.product).toBe(product);
            expect(basketItem2.quantity).toBe(2);
            expect(basketItem2.getTotal()).toBe(4);
            expect(freshBasketService.getItems().length).toBe(1);
        });

        it('shouldn\'t cumulate same products with different variant ids', function () {
            product.name = 'Testproduct';
            product.id = 10;

            var variant1 = {
                variantID: 123
            };

            var variant2 = {
                variantID: 46
            };

            var basketItem = basketService.addItem(product, 1, variant1);
            var basketItem2 = basketService.addItem(product, 1, variant2);

            expect(basketService.exists(product, variant1)).toBe(true);
            expect(basketService.exists(product, variant2)).toBe(true);
            expect(basketItem.product).toBe(product);
            expect(basketItem2.product).toBe(product);
            expect(basketItem).not.toBe(basketItem2);
            expect(basketService.getItems().length).toBe(2);
        });

        it('should cumulate same products with identical variant ids', function () {
            product.name = 'Testproduct';
            product.id = 10;

            var basketItem = basketService.addItem(product, 1, 1);
            var basketItem2 = basketService.addItem(product, 1, 1);

            var summary = basketService.getSummary();

            expect(summary.quantity).toBe(2);
            expect(basketItem.product).toBe(product);
            expect(basketItem2.product).toBe(product);
            expect(basketItem).toBe(basketItem2);
            expect(basketItem.quantity).toBe(2);
            expect(basketService.getItems().length).toBe(1);
        });

        it('should cumulate same products with identical optionids', function () {
            product.name = 'Testproduct';
            product.id = 10;

            var basketItem = basketService.addItem(product, 1, 1, 1);
            var basketItem2 = basketService.addItem(product, 1, 1, 1);

            var summary = basketService.getSummary();

            expect(summary.quantity).toBe(2);
            expect(basketItem.product).toBe(product);
            expect(basketItem2.product).toBe(product);
            expect(basketItem).toBe(basketItem2);
            expect(basketItem.quantity).toBe(2);
            expect(basketService.getItems().length).toBe(1);
        });

        it('should cumulate same products with different option ids', function () {
            product.name = 'Testproduct';
            product.id = 10;

            var variant1 = {
                price: 10.00,
                variantID: 1,
                optionID: 1
            };

            var variant2 = {
                price: 10.00,
                variantID: 1,
                optionID: 2
            };

            var basketItem = basketService.addItem(product, 1, variant1);
            var basketItem2 = basketService.addItem(product, 1, variant2);


            var summary = basketService.getSummary();

            expect(summary.quantity).toBe(2);
            expect(basketService.exists(product, variant1)).toBe(true);
            expect(basketService.exists(product, variant2)).toBe(true);
            expect(basketItem.product).toBe(product);
            expect(basketItem.variant).toBe(variant1);
            expect(basketItem2.product).toBe(product);
            expect(basketItem2.variant).toBe(variant2);
            expect(basketItem).not.toBe(basketItem2);
            expect(basketItem.quantity).toBe(1);
            expect(basketItem2.quantity).toBe(1);
            expect(basketService.getItems().length).toBe(2);
        });

        it('should calculate correct taxes for coupons', function () {
            var product1 = new sofa.models.Product();
            product1.name = 'Testproduct';
            product1.id = 1;
            product1.price = 100;
            product1.tax = 19;

            var product2 = new sofa.models.Product();
            product2.name = 'Testproduct';
            product2.id = 2;
            product2.price = 30;
            product2.tax = 7;

            var coupon = {
                amount: 10,
                code: 'ZEHN',
                description: '10.00 Discount',
                error: null,
                freeShipping: '0',
                name: 'ZEHN',
                sortOrder: '0',
                type: 'fix',
                tax: 19
            };

            var basketItem = basketService.addItem(product1, 2);
            var basketItem2 = basketService.addItem(product2, 3);

            basketService.addCoupon(coupon);
            var summary = basketService.getSummary();

            expect(summary.quantity).toBe(5);
            expect(basketItem.product).toBe(product1);
            expect(basketItem2.product).toBe(product2);

            expect(summary.total).toBe(285);
            expect(summary.vat).toBe(37.02);
            expect(summary.vatStr).toBe('37.02');
        });
    });

    describe('sofa.BasketService#increase', function () {

        var product;

        beforeEach(function () {
            basketService.clear();
            product = new sofa.models.Product();
        });

        it('should increase quantity by any number', function () {

            product.name = 'Testproduct';
            product.id = 10;

            var basketItem = basketService.addItem(product, 1);
            var basketItem2 = basketService.addItem(product, 2);
            var summary = basketService.getSummary();

            expect(summary.quantity).toBe(3);
            expect(basketItem.product).toBe(product);
            expect(basketItem).toBe(basketItem2);
            expect(basketItem.quantity).toBe(3);
            expect(basketService.getItems().length).toBe(1);
        });
    });

    describe('sofa.BasketService#remove', function () {

        var product;

        beforeEach(function () {
            basketService.clear();
            product = new sofa.models.Product();
        });

        it('should remove items by any number', function () {

            product.name = 'Testproduct';
            product.id = 10;

            var basketItem = basketService.addItem(product, 10);
            var summary = basketService.getSummary();

            expect(summary.quantity).toBe(10);
            expect(basketItem.product).toBe(product);
            expect(basketItem.quantity).toBe(10);

            var itemRemovedCalled = 0;

            basketService.on('itemRemoved', function () { itemRemovedCalled++; });

            basketService.removeItem(product, 5);

            var summaryAfter = basketService.getSummary();

            expect(itemRemovedCalled).toBe(1);
            expect(summaryAfter.quantity).toBe(5);
            expect(basketItem.quantity).toBe(5);
        });

        it('should raise an exception when removing not existing item', function () {
            product.name = 'Testproduct';
            product.id = 10;

            expect(function () {
                basketService.removeItem(product, 5);
            }).toThrowError('Product id: 10 , variant: undefined  does not exist in the basket');
        });

        it('should throw an exception when removing more items than what exist', function () {

            product.name = 'Testproduct';
            product.id = 10;

            var basketItem = basketService.addItem(product, 10);

            expect(basketItem.product).toBe(product);
            expect(basketItem.quantity).toBe(10);

            expect(function () {
                basketService.removeItem(product, 11);
            }).toThrowError('remove quantity is higher than existing quantity');
        });
    });

    describe('sofa.BasketService#clear', function () {

        var product;

        beforeEach(function () {
            basketService.clear();
            product = new sofa.models.Product();
        });

        it('should clear all items', function () {
            product.name = 'Testproduct';
            product.id = 10;

            var variant1 = {
                variantID: 123
            };

            var variant2 = {
                variantID: 456
            };

            var basketItem = basketService.addItem(product, 1, variant1);
            var basketItem2 = basketService.addItem(product, 1, variant2);

            var product2 = new sofa.models.Product();
            product2.name = 'Testproduct';
            product2.id = 12;

            basketItem = basketService.addItem(product2, 1, variant1);
            basketItem2 = basketService.addItem(product2, 1, variant2);

            expect(basketService.getItems().length).toBe(4);

            var clearedCalled = 0;

            basketService.on('cleared', function () { clearedCalled++; });
            basketService.clear();

            expect(clearedCalled).toBe(1);

            var summaryAfter = basketService.getSummary();

            expect(summaryAfter.quantity).toBe(0);
            expect(basketService.getItems().length).toBe(0);
        });

        it('should calculate summary', function () {
            product.name = 'Testproduct';
            product.id = 1;
            product.price = 4.65;
            product.tax = 19;

            var product2 = new sofa.models.Product();
            product2.name = 'Testproduct';
            product2.id = 2;
            product2.price = 12.28;
            product2.tax = 7;

            var product3 = new sofa.models.Product();
            product3.name = 'Testproduct';
            product3.id = 3;
            product3.price = 9.00;
            product3.tax = 7;

            var variant = {
                price: 10.00
            };

            basketService.addItem(product, 1);
            basketService.addItem(product, 4);

            basketService.addItem(product2, 2);
            basketService.addItem(product2, 3);

            basketService.addItem(product3, 1, variant);

            var summary = basketService.getSummary();
            var itemCount = basketService.getItems().length;

            expect(itemCount).toBe(3);
            expect(summary.quantity).toBe(11);
            expect(summary.sum).toBe(94.65);
            expect(summary.vat).toBe(9.18);
            expect(summary.total).toBe(99.65);
            expect(summary.shipping).toBe(5);
        });

        it('should calculate summary', function () {

            product.name = 'Testproduct';
            product.id = 1;
            product.price = 29.99;
            product.tax = 19;

            basketService.addItem(product, 1);

            var summary = basketService.getSummary({
                paymentMethod: { surcharge: 3 },
                shippingMethod: { price: 2.90 }
            });
            var itemCount = basketService.getItems().length;

            expect(itemCount).toBe(1);
            expect(summary.surchargeStr).toBe('3.00');
            expect(summary.surcharge).toBe(3);
            expect(summary.shipping).toBe(2.90);
            expect(summary.vat).toBe(5.25);
            expect(summary.total).toBe(35.89);
        });
    });

    describe('sofa.BasketService#isEmpty', function () {

        it('should be a function', function () {
            expect(typeof basketService.isEmpty).toBe('function');
        });

        it('should report true or false accordingly', function () {
            expect(basketService.isEmpty()).toBe(true);

            var product = new sofa.models.Product();
            product.name = 'Testproduct';
            product.id = 10;

            basketService.addItem(product, 1);
            expect(basketService.isEmpty()).toBe(false);
            basketService.clear();
            expect(basketService.isEmpty()).toBe(true);

        });
    });
});

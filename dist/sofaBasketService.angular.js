/**
 * sofa-basket-service - v0.6.0 - Wed Mar 25 2015 15:43:42 GMT+0100 (CET)
 * http://www.sofa.io
 *
 * Copyright (c) 2014 CouchCommerce GmbH (http://www.couchcommerce.com / http://www.sofa.io) and other contributors
 * THIS SOFTWARE CONTAINS COMPONENTS OF THE SOFA.IO COUCHCOMMERCE SDK (WWW.SOFA.IO)
 * IT IS PROVIDED UNDER THE LICENSE TERMS OF THE ATTACHED LICENSE.TXT.
 */
;(function (angular) {
/* global store */
angular.module('sofa.basketService', [
    // TODO: Investigate. I'm not sold this should be handled on this level.
    store.enabled ? 'sofa.storages.localStorageService' : 'sofa.storages.memoryStorageService',
    'sofa.core'
])

.factory('basketService', ["storageService", "configService", function (storageService, configService) {
    'use strict';
    return new sofa.BasketService(storageService, configService);
}]);
}(angular));

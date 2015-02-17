/* global store */
angular.module('sofa.basketService', [
    // TODO: Investigate. I'm not sold this should be handled on this level.
    store.enabled ? 'sofa.storages.localStorageService' : 'sofa.storages.memoryStorageService',
    'sofa.core'
])

.factory('basketService', function (storageService, configService) {
    'use strict';
    return new sofa.BasketService(storageService, configService);
});

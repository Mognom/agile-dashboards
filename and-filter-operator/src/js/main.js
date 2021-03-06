/*
 * and-filter
 * https://repo.conwet.fi.upm.es/wirecloud/agile-dashboards
 *
 * Copyright (c) 2016 CoNWeT
 * Licensed under the Apache2 license.
 */

 /*global MashupPlatform */

(function () {

    "use strict";

    var original_list = null;
    var filters = [];
    var appliedFilters = {};
    var filtered;

    var init = function init () {

        MashupPlatform.wiring.registerCallback("original-list", function (_original_list) {
            if (JSON.stringify(original_list) !== JSON.stringify(_original_list)) {
                original_list = _original_list;

                filter();
            }
        });

        MashupPlatform.wiring.registerCallback("condition-list", function (_filters) {
            appliedFilters = {};
            filters = build_filters(_filters);
            filter();
        });

        MashupPlatform.wiring.registerStatusCallback(pushData);

    };

    var pushData = function pushData () {
        MashupPlatform.wiring.pushEvent('filtered-list', filtered);
    };

    //Get nested property of an object
    var getProperty = function getProperty (item, attr) {
        //If theres no attr then the result is the original item
        if (!attr || attr === "") {
            return item;
        }
        //Search for the propertys
        attr = attr.split(".");
        for (var i = 0; i < attr.length; i++) {
            if (!item[attr[i]]) {
                return item[attr[i]];
            }
            item = item[attr[i]] ;
        }
        return item;
    };

    var EQ_FILTER = function EQ_FILTER(attr, value, item) {
        return getProperty(item, attr) === value;
    };

    var NOT_FILTER = function NOT_FILTER (attr, value, item) {
        return getProperty(item, attr) !== value;
    };

    var IN_FILTER = function IN_FILTER(attr, values, item) {
        var it = getProperty(item, attr);
        return values.indexOf(it) !== -1;
    };

    var RANGE_FILTER = function RANGE_FILTER(attr, start, end, item) {
        var value = getProperty(item, attr);
        return value >= start && value <= end;
    };

    var SOME_FILTER = function SOME_FILTER(attr, value, item) {
        var it = getProperty(item, attr);

        return it.some(function (i) {
            return i === value;
        });
    };

    var build_filters = function build_filters(filters) {
        var filter_funcs = [];

        for (var i = 0; i < filters.length; i++) {
            appliedFilters[filters[i].name] = filters[i].value || "";
            switch (filters[i].type) {
            case "in":
                filter_funcs.push(IN_FILTER.bind(null, filters[i].attr, filters[i].values));
                break;
            case "range":
                filter_funcs.push(RANGE_FILTER.bind(null, filters[i].attr, filters[i].start, filters[i].end));
                break;
            case "some":
                filter_funcs.push(SOME_FILTER.bind(null, filters[i].attr, filters[i].value));
                break;
            case "not":
                filter_funcs.push(NOT_FILTER.bind(null, filters[i].attr, filters[i].value));
                break;
            default:
            case "eq":
                filter_funcs.push(EQ_FILTER.bind(null, filters[i].attr, filters[i].value));
                break;
            }
        }

        return filter_funcs;
    };

    var filter = function filter() {
        filtered = [];

        if (!original_list) {
            return;
        }

        //Filter the list
        if (filters.length > 0) {
            original_list.forEach(function (item) {
                if (filters.every(function (filter) {return filter(item);})) {
                    filtered.push(item);
                }
            });
        } else {
            filtered = original_list.slice(0);
        }
        //Save the metadata if any
        filtered.metadata = original_list.metadata || {};
        //Add appliedFilters metadata
        filtered.metadata.filtered = appliedFilters;

        MashupPlatform.wiring.pushEvent('filtered-list', filtered);
    };

    init ();

    /* test-code */
    var test = {};

    test.getProperty = getProperty;
    test.EQ_FILTER = EQ_FILTER;
    test.EQ_FILTER = EQ_FILTER;
    test.IN_FILTER = IN_FILTER;
    test.RANGE_FILTER = RANGE_FILTER;
    test.SOME_FILTER = SOME_FILTER;

    window.AndFilter = test;

    /* end-test-code */

})();
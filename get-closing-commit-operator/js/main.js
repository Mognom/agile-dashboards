/*
 * get-closing-commit
 *
 *
 * Copyright (c) 2016 CoNWet
 * Licensed under the MIT license.
 */

(function () {

    "use strict";

    var issue;
    var outputCommit;

    //Stablish callbacks
    var init = function init() {

        MashupPlatform.wiring.registerStatusCallback(pushInfo);

        MashupPlatform.wiring.registerCallback("issue", function (data) {
            //If its a new issue, reset cached data.
            data = data[0] || data;

            if (issue && issue.key !== data.key) {
                outputCommit = null;
                issue = null;
            }

            //Check if the issue has a closing commit
            if (data.closingCommit) {
                issue = data;
            }

            pushInfo ();

        });
    };

    var pushInfo = function pushInfo () {
        if (!issue) {
            return;
        }

        //Send previous data or harvest new data
        if (outputCommit) {
            MashupPlatform.wiring.pushEvent("commit", outputCommit);
        } else {
            harvestClosingCommit();
        }
    };

    //If the commit is not within the input commits, try and harvest it
    var harvestClosingCommit = function harvestClosingCommit() {

        var requestHeaders = {
            Accept: "application/vnd.github.v3.html+json"
        };

        var oauth2_token = MashupPlatform.prefs.get("oauth2-token").trim();
        var user = MashupPlatform.prefs.get("username").trim();
        var pass = MashupPlatform.prefs.get("passwd").trim();

        //Choose authentication method if any
        if (oauth2_token !== '') {
            requestHeaders.Authorization = 'token ' + oauth2_token;
        } else if (user !== "" && pass !== "") {
            var token = btoa(user + ":" + pass); //Build the basic authentication token
            requestHeaders.Authorization = "Basic " + token;
        }

        //Harvest the commit
        MashupPlatform.http.makeRequest(issue.closingCommitUri, {
            method: 'GET',
            supportsAccessControl: true,
            parameters: {
                state: 'all',
                per_page: 100
            },
            requestHeaders: requestHeaders,
            onSuccess: function (response) {
                var data = JSON.parse(response.responseText);
                outputCommit = normalizeCommit (data);
                MashupPlatform.wiring.pushEvent("commit", outputCommit);
            }
        });
    };

    //Removes useless JSON data and gives a normalized format
    var normalizeCommit = function normalizeCommit (commit) {
        var result = {};

        //Id
        result.sha = commit.sha;

        //Creation data
        result.author = commit.commit.author.name;
        result.month = commit.commit.author.date.substring(0, 7);
        result.timestamp = Date.parse(commit.author.date);

        //Commit data
        result.parents = commit.parents;
        result.stats = commit.stats;
        result.files = commit.files;
        result.message = commit.message;

        return result;
    };

    init();

})();

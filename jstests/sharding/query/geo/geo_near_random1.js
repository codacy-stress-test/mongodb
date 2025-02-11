/**
 * This tests all points using $near.
 * @tags: [requires_fcv_81]
 */

import {GeoNearRandomTest} from "jstests/libs/query/geo_near_random.js";
import {ShardingTest} from "jstests/libs/shardingtest.js";

var testName = jsTestName();
var s = new ShardingTest({shards: 3});

var db = s.getDB("test");

var test = new GeoNearRandomTest(testName, db);

assert.commandWorked(s.s0.adminCommand({enablesharding: 'test', primaryShard: s.shard1.shardName}));
assert.commandWorked(s.s0.adminCommand({shardcollection: ('test.' + testName), key: {_id: 1}}));

test.insertPts(50);
var shardList = [s.shard0.shardName, s.shard1.shardName, s.shard2.shardName];
for (var i = (test.nPts / 10); i < test.nPts; i += (test.nPts / 10)) {
    assert.commandWorked(s.s0.adminCommand({split: ('test.' + testName), middle: {_id: i}}));
    try {
        assert.commandWorked(s.s0.adminCommand({
            moveChunk: ('test.' + testName),
            find: {_id: i - 1},
            to: (shardList[i % 3]),
            _waitForDelete: true
        }));
    } catch (e) {
        // ignore this error
        if (!e.message.match(/that chunk is already on that shard/)) {
            throw e;
        }
    }
}

// Turn balancer back on, for actual tests
// s.startBalancer(); // SERVER-13365

var opts = {};
test.testPt([0, 0], opts);
test.testPt(test.mkPt(), opts);
test.testPt(test.mkPt(), opts);
test.testPt(test.mkPt(), opts);
test.testPt(test.mkPt(), opts);

s.stop();

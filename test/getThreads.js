/*
 * Copyright (c) Novedia Group 2012.
 *
 *     This file is part of Hubiquitus.
 *
 *     Hubiquitus is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     Hubiquitus is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with Hubiquitus.  If not, see <http://www.gnu.org/licenses/>.
 */

var should = require("should");
var conf = require('./testConfig.js');
var hClient = require('../hubiquitus.js').hClient;

describe('#getThreads()', function() {
    var activeChannel = 'chan' + Math.floor(Math.random()*10000),
        inactiveChannel = 'chan' + Math.floor(Math.random()*10000),
        notInPartChannel = 'chan' + Math.floor(Math.random()*10000),
        status = 'status' + Math.floor(Math.random()*10000),
        shouldNotAppearConvids = [],
        shouldAppearConvids = [],
        initialConvids = [];

    var user = conf.logins[0];

    before(conf.connect)

    after(conf.disconnect)

    before(function(done){
        conf.createChannel(activeChannel, user.login, [user.login], true, done);
    })

    before(function(done){
        conf.createChannel(inactiveChannel, user.login, [user.login], false, done);
    })

    before(function(done){
        conf.createChannel(notInPartChannel, user.login, [], false, done);
    })


    for(var i = 0; i < 10; i++)
        before(function(done){
            hClient.publish(hClient.buildMessage(activeChannel, undefined, undefined, {transient: false}), function(hResult){
                hResult.status.should.be.eql(hClient.hResultStatus.OK);
                initialConvids.push(hResult.result.convid);
                done();
            });

        })

    //Root messages with different status
    for(var i = 0; i < 2; i++)
        before(function(done){
            hClient.publish(hClient.buildConvState(activeChannel, initialConvids.pop(), 'status' + Math.floor(Math.random()*10000),
                {transient: false}), function(hResult){
                hResult.status.should.be.eql(hClient.hResultStatus.OK);
                shouldNotAppearConvids.push(hResult.result.convid);
                done();
            })
        })

    //Change state of one of the previous convstate to a good one
    before(function(done){
        hClient.publish(hClient.buildConvState(activeChannel, shouldNotAppearConvids.pop(), status,
            {transient: false}), function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.OK);
            shouldAppearConvids.push('' + hResult.result.convid);
            done();
        })
    })

    //Add a new conversation with good status
    before(function(done){
        hClient.publish(hClient.buildConvState(activeChannel, initialConvids.pop(), status,
            {transient: false}), function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.OK);
            shouldAppearConvids.push('' + hResult.result.convid);
            done();
        })
    })

    it('should return status OK with empty array if no messages with sent status', function(done){
        hClient.getThreads(activeChannel, '' + Math.floor(Math.random()*10000), function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.OK);
            hResult.result.should.be.an.instanceof(Array).and.have.lengthOf(0);
            done();
        })
    })

    it('should return status OK with array with all convids that correspond to the status sent', function(done){
        hClient.getThreads(activeChannel, status, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.OK);
            for(var i = 0; i < shouldAppearConvids.length; i++)
                hResult.result.should.include(shouldAppearConvids[i]);
            done();
        })
    })

    it('should return status OK with array without elements that HAD the status but then changed', function(done){
        hClient.getThreads(activeChannel, status, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.OK);
            for(var i = 0; i < shouldNotAppearConvids.length; i++)
                hResult.result.should.not.include(shouldNotAppearConvids[i]);
            done();
        })
    })

    it('should return status error NOT_AUTHORIZED if channel is inactive', function(done){
        hClient.getThreads(inactiveChannel, status, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.NOT_AUTHORIZED);
            done();
        })
    })

    it('should return status error NOT_AUTHORIZED if sender not in participants list', function(done){
        hClient.getThreads(notInPartChannel, status, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.NOT_AUTHORIZED);
            done();
        })
    })

    it('should return status error MISSING_ATTR if chid is not passed', function(done){
        hClient.getThreads(undefined, status, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.MISSING_ATTR);
            done();
        })
    })

    it('should return status error MISSING_ATTR if status is not passed', function(done){
        hClient.getThreads(activeChannel, undefined, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.MISSING_ATTR);
            done();
        })
    })

    it('should return status error INVALID_ATTR if chid is not a string', function(done){
        hClient.getThreads([], status, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.INVALID_ATTR);
            done();
        })
    })

    it('should return status error INVALID_ATTR if status is not a string', function(done){
        hClient.getThreads(activeChannel, [], function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.INVALID_ATTR);
            done();
        })
    })

    it('should return status error NOT_AVAILABLE if chid does not correspond to a valid hChannel', function(done){
        hClient.getThreads('this does not exist', status, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.NOT_AVAILABLE);
            done();
        })
    })

})

describe('#getThreads()', function() {

    it('should return a hResult with status NOT_CONNECTED if user tries to getThreads while disconnected', function(done){
        hClient.getThreads('this channel does not exist', 'this is not a good status', function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.NOT_CONNECTED);
            done();
        })
    })

})


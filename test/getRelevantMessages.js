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

var should = require('should');
var conf = require('./testConfig.js');
var hClient = require('../hubiquitus.js').hClient;

describe('#getRelevantMessages()', function(){

    var nbMsgs = 10;
    var activeChan = 'chan' + Math.floor(Math.random()*10000);
    var notInPart = 'chan' + Math.floor(Math.random()*10000);
    var inactiveChan = 'chan' + Math.floor(Math.random()*10000);
    var emptyChannel = 'chan' + Math.floor(Math.random()*10000);
    var user = conf.logins[0];


    before(conf.connect)

    after(conf.disconnect)

    before(function(done){
        conf.createChannel(activeChan, user.login, [user.login], true, done);
    })

    for(var i = 0; i < nbMsgs; i++)
        before(function(done){
            hClient.publish(hClient.buildMessage(activeChan, undefined, undefined,
                {   transient: false,
                    relevance: new Date( new Date().getTime() + 1000000 )}), function(a){
                a.status.should.be.eql(hClient.hResultStatus.OK);
                done(); });
        })

    for(var i = 0; i < nbMsgs; i++)
        before(function(done){
            hClient.publish(hClient.buildMessage(activeChan, undefined, undefined,
                {   transient: false,
                    relevance: new Date( new Date().getTime() - 100000 )}), function(a){
                a.status.should.be.eql(hClient.hResultStatus.OK);
                done(); });
        })

    for(var i = 0; i < nbMsgs; i++)
        before(function(done){
            hClient.publish(hClient.buildMessage(activeChan, undefined, undefined, {transient: false}), function(a){
                a.status.should.be.eql(hClient.hResultStatus.OK);
                done(); });
        })

    before(function(done){
        conf.createChannel(emptyChannel, user.login, [user.login], true, done);
    })

    before(function(done){
        conf.createChannel(notInPart, user.login, ['a@b.com'], true, done);
    })

    before(function(done){
        conf.createChannel(inactiveChan, user.login, [user.login], false, done);
    })


    it('should return hResult error MISSING_ATTR if chid is missing', function(done){
        hClient.getRelevantMessages(undefined, function(hResult){
            hResult.should.have.property('status', hClient.hResultStatus.MISSING_ATTR);
            hResult.result.should.match(/chid/);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if chid is not a string', function(done){
        hClient.getRelevantMessages([], function(hResult){
            hResult.should.have.property('status', hClient.hResultStatus.INVALID_ATTR);
            hResult.result.should.match(/chid/);
            done();
        });
    })

    it('should return hResult error NOT_AVAILABLE if channel was not found', function(done){
        hClient.getRelevantMessages('not a valid channel', function(hResult){
            hResult.should.have.property('status', hClient.hResultStatus.NOT_AVAILABLE);
            hResult.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if not in participants list', function(done){
        hClient.getRelevantMessages(notInPart, function(hResult){
            hResult.should.have.property('status', hClient.hResultStatus.NOT_AUTHORIZED);
            hResult.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if channel is inactive', function(done){
        hClient.getRelevantMessages(inactiveChan, function(hResult){
            hResult.should.have.property('status', hClient.hResultStatus.NOT_AUTHORIZED);
            hResult.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult OK with an array of valid messages and without msgs missing relevance', function(done){
        hClient.getRelevantMessages(activeChan, function(hResult){
            hResult.should.have.property('status', hClient.hResultStatus.OK);
            hResult.result.length.should.be.eql(nbMsgs);
            for(var i = 0; i < hResult.result.length; i++)
                new Date(hResult.result[i].relevance).getTime().should.be.above(new Date().getTime());
            done();
        });
    })

    it('should return hResult OK with an empty array if no matching msgs found', function(done){
        hClient.getRelevantMessages(emptyChannel, function(hResult){
            hResult.should.have.property('status', hClient.hResultStatus.OK);
            hResult.result.length.should.be.eql(0);
            done();
        });
    })

})
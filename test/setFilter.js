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

var user = conf.logins[0];

describe('#setFilter()', function() {
    var activeChannel = 'chan' + Math.floor(Math.random()*10000),
        inactiveChannel = 'chan' + Math.floor(Math.random()*10000),
        notInPartChannel = 'chan' + Math.floor(Math.random()*10000),
        hFilterTemplate;

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

    beforeEach(function(){
        hFilterTemplate = {
            name: 'filter' + Math.floor(Math.random()*10000),
            chid: activeChannel,
            template: {}
        }
    })

    it('should return NOT_AUTHORIZED if channel inactive', function(done){
        hFilterTemplate.chid = inactiveChannel;
        hClient.setFilter(hFilterTemplate, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.NOT_AUTHORIZED);
            hResult.result.should.be.a('string');
            done();
        })
    })

    it('should return NOT_AUTHORIZED if user not in participants list', function(done){
        hFilterTemplate.chid = notInPartChannel;
        hClient.setFilter(hFilterTemplate, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.NOT_AUTHORIZED);
            hResult.result.should.be.a('string');
            done();
        })
    })

    it('should return MISSING_ATTR if chid is missing', function(done){
        delete hFilterTemplate.chid;
        hClient.setFilter(hFilterTemplate, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.MISSING_ATTR);
            hResult.result.should.be.a('string');
            done();
        })
    })

    it('should return MISSING_ATTR if name is missing', function(done){
        delete hFilterTemplate.name;
        hClient.setFilter(hFilterTemplate, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.MISSING_ATTR);
            hResult.result.should.be.a('string');
            done();
        })
    })

    it('should return INVALID_ATTR if no template is sent', function(done){
        hClient.setFilter(null, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.INVALID_ATTR);
            hResult.result.should.be.a('string');
            done();
        })
    })

    it('should return INVALID_ATTR if relevance is sent', function(done){
        hFilterTemplate.template.relevance = new Date();
        hClient.setFilter(hFilterTemplate, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.INVALID_ATTR);
            hResult.result.should.be.a('string');
            done();
        })
    })

    it('should return INVALID_ATTR if transient is sent', function(done){
        hFilterTemplate.template.transient = true;

        hClient.setFilter(hFilterTemplate, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.INVALID_ATTR);
            hResult.result.should.be.a('string');
            done();
        })
    })

    it('should return INVALID_ATTR if published is sent', function(done){
        hFilterTemplate.template.published = new Date();

        hClient.setFilter(hFilterTemplate, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.INVALID_ATTR);
            hResult.result.should.be.a('string');
            done();
        })
    })

    it('should return INVALID_ATTR if chid is sent in template', function(done){
        hFilterTemplate.template.chid = 'something';

        hClient.setFilter(hFilterTemplate, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.INVALID_ATTR);
            hResult.result.should.be.a('string');
            done();
        })
    })

    it('should return INVALID_ATTR if lng is sent but radius is not', function(done){
        hFilterTemplate.template.location = {lng: '2.1224111'};

        hClient.setFilter(hFilterTemplate, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.INVALID_ATTR);
            hResult.result.should.be.a('string');
            done();
        })
    })

    it('should return INVALID_ATTR if lat is sent but radius is not', function(done){
        hFilterTemplate.template.location = {lat: '2.1224111'};

        hClient.setFilter(hFilterTemplate, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.INVALID_ATTR);
            hResult.result.should.be.a('string');
            done();
        })
    })

    it('should return NOT_AVAILABLE if chid does not exist', function(done){
        hFilterTemplate.chid = 'this does not exist';

        hClient.setFilter(hFilterTemplate, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.NOT_AVAILABLE);
            hResult.result.should.be.a('string');
            done();
        })
    })

    it('should return OK with correct filter', function(done){
        hFilterTemplate.template.priority = 3;

        hClient.setFilter(hFilterTemplate, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.OK);
            done();
        })
    })
})

describe('#setFilter()', function() {

    it('should return a hResult with status NOT_CONNECTED if user tries to set filter while disconnected', function(done){
        hClient.setFilter({}, function(hResult){
            hResult.status.should.be.eql(hClient.hResultStatus.NOT_CONNECTED);
            done();
        })
    })

})


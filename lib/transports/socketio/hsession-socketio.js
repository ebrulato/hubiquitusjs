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

//Make it compatible with node and web browser
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(
    ['../../codes', '../../sessionStorage'],
    function(codes, sessionStorageAux){
        var statuses = codes.statuses;
        var errors = codes.errors;

        //Loading exclusive modules for Node
        if(typeof module !== 'undefined' && module.exports){
            io = require('socket.io-client');
        }

        //Taking care of session Storage. Sometimes the browser doesn't find it
        //And if it's node or we don't have support so we use 'our version'
        if(!sessionStorage){
            if(typeof window !== 'undefined' && window.sessionStorage)
                var sessionStorage = window.sessionStorage;
            else
                var sessionStorage = sessionStorageAux.sessionStorage;
        }

        /**
         * Constructor to establish a connection to the socketIO server.
         * @param opts - Required options to connect
         */
        var hSessionSocketIO = function(publisher, password, cb, opts){
            this.opts = opts;
            this.publisher = publisher;
            this.password = password;
            this.callback = cb;
            this.retryIntervals = opts.retryIntervals;
            this.rid = 0;
            this.status = statuses.DISCONNECTED;
            this.errorCode = errors.NO_ERROR;
        };

        /**
         * Connects to the gateway by using a new connection or by attaching
         * to an existing one and starts listening for events.
         * This sets a timer for the connection. If the timeout expires we send a CONNECTION_TIMEOUT
         * @options - Options to establish the socket
         */
        hSessionSocketIO.prototype.connect = function(){
            var self = this;
            var on_socket;

            var re = new RegExp(this.publisher,"i");
            //If we have information stored, and not of the same user, send error.
            if(!this.opts.stress && typeof sessionStorage.getItem('publisher') === 'string' &&
                sessionStorage.getItem('publisher').search(re) == -1){
                this.on_status({status: statuses.CONNECTED, errorCode: errors.ALREADY_CONNECTED});
                return;
            }

            if(!this.opts.stress && typeof sessionStorage.getItem('publisher') === 'string'){
                self.on_status({status: statuses.REATTACHING, errorCode: errors.NO_ERROR});
                on_socket = function(){
                    self.addListeners();
                    self.socket.emit('attach', {
                        publisher: sessionStorage.getItem('publisher'),
                        rid: sessionStorage.getItem('rid'),
                        sid: sessionStorage.getItem('sid')});
                };
            }else{
                //Only send a Connecting if not reconnecting
                if(self.errorCode == errors.NO_ERROR)
                    self.on_status({status: statuses.CONNECTING, errorCode: errors.NO_ERROR});
                on_socket = function(){
                    self.addListeners();
                    //Start a new connection
                    self.socket.emit('hConnect', {
                        publisher: self.publisher,
                        password: self.password,
                        serverHost: self.opts.serverHost,
                        serverPort: self.opts.serverPort});
                };
            }

            //Wait before returning error in connection
            this.connect_timeout = setTimeout(function(){
                self.on_status.call(self,{status: statuses.CONNECTING, errorCode: errors.CONN_TIMEOUT})
            }, self.opts.timeout * 1000);

            //When reconnecting, the socket exists, we just need to attach or connect to XMPP
            //FIXME: this test in browser doesn't work
            if( !this.opts.stress && this.socket ){
                on_socket();
                return;
            }

            this.socket = io.connect(this.opts.endpoint, {
                'force new connection': true,
                'connect timeout': 2000,
                'transports': ['websocket', 'xhr-polling', 'jsonp-polling', 'xhr-multipart']
            });

            this.socket.on('connect', on_socket);
            //This errors are connection errors, when they happen call the correct event
            this.socket.on('error', function(){
                self.on_status({status: statuses.DISCONNECTED, errorCode: errors.TECH_ERROR});
            });
        };

        /**
         * Adds the required listeners to receive data from the server
         */
        hSessionSocketIO.prototype.addListeners = function(){
            var self = this;

            //Remove old listeners. Useful if reconnecting
            var events = ['hStatus', 'hMessage', 'hResult', 'hCommand', 'attrs'];
            for(var i = 0; i < events.length; i++)
                this.socket.removeAllListeners(events[i]);

            //Listens for status changes
            this.socket.on('hStatus', self.on_status.bind(self));

            //Listen for items
            this.socket.on('hMessage', function(hMessage){
                self.rid++;
                self.callback('hMessage', hMessage);
            });

            //Listen for hResults to our hCommands
            this.socket.on('hResult', function(hResult){
                self.rid++;
                self.callback('hResult', hResult);
            });

            //Listen for hCommands
            this.socket.on('hCommand', function(hResult){
                self.rid++;
                self.callback('hCommand', hResult);
            });

            //Listen once for the attributes sent when connected
            this.socket.once('attrs', function(attrs){
                self.rid = attrs.rid;
                sessionStorage.setItem('publisher', attrs.publisher);
                sessionStorage.setItem('rid', attrs.rid);
                sessionStorage.setItem('sid', attrs.sid);
            });
        };

        /**
         * Asks the server to close the XMPP connection and the open socket
         */
        hSessionSocketIO.prototype.disconnect = function(){
            //If we are disconnected or another action in progress
            if(this.status == statuses.DISCONNECTED || this.status == statuses.DISCONNECTING){
                if(this.socket)
                    this.socket.disconnect();
                return;
            }

            this.on_status({status: statuses.DISCONNECTING, errorCode: errors.NO_ERROR});
            clearTimeout(this.connect_timeout);
            //Remove our attrs
            sessionStorage.removeItem('publisher');
            sessionStorage.removeItem('sid');
            sessionStorage.removeItem('rid');
            if(this.socket)
                this.socket.disconnect();
            this.on_status({status: statuses.DISCONNECTED, errorCode: errors.NO_ERROR});
        };

        /**
         * Sends an hCommand to the Server (implicitly waiting for an hResult)
         * @param hCommand - an hCommand built using hCommandBuilder
         */
        hSessionSocketIO.prototype.sendhCommand = function(hCommand){
            this.socket.emit('hCommand', hCommand);
        };

        /**
         * Activates callback when there is a change in the server status
         * @param status - {status: statuses.*, code: <int>}
         */
        hSessionSocketIO.prototype.on_status = function(msg){
            if(msg){
                this.status = msg.status;
                this.errorCode = msg.errorCode;
                this.callback('hStatus', msg);

                if(msg.errorCode == errors.NO_ERROR &&
                    (msg.status == statuses.CONNECTED || msg.status == statuses.REATTACHED)){
                    var self = this;
                    //Save RID when changing pages/refreshing (only browser)
                    if(typeof window !== 'undefined')
                        window.onunload = function(){
                            sessionStorage.setItem('rid', self.rid);
                        };

                    clearTimeout(this.connect_timeout);
                    this.retryIntervals = this.opts.retryIntervals; //Resets the reconnection counter
                }
                else if(msg.errorCode != errors.NO_ERROR){
                    clearTimeout(this.connect_timeout);
                    sessionStorage.removeItem('publisher');
                    sessionStorage.removeItem('sid');
                    sessionStorage.removeItem('rid');

                    if(msg.errorCode == errors.AUTH_FAILED ||
                        msg.errorCode == errors.ALREADY_CONNECTED) return;
                    var timeout = this.retryIntervals.length == 1 ? this.retryIntervals[0] : this.retryIntervals.pop();
                    setTimeout(this.connect.bind(this),timeout*1000);
                }
            }
        };

//requireJS way to allow other files to import this variable
        return{
            hSessionSocketIO: hSessionSocketIO
        }
    }
);
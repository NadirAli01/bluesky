import React, { useState } from 'react';
import { connect, useSelector } from 'react-redux';
import Typography from '@material-ui/core/Typography';
import CssBaseline from '@material-ui/core/CssBaseline';
import { MuiThemeProvider, createMuiTheme, Fade } from '@material-ui/core';
import Nui from '../../util/Nui';

export default connect()((props) => {
    let websocket;
    let connected = false;
    let lastPing = 0;
    let lastReconnect = 0;
    let lastOk = 0;
    let color;
    let myip;
    
    let voip = {};
    
    const OK = 0;
    const NOT_CONNECTED = 1;
    const PLUGIN_INITIALIZING = 2;
    const WRONG_SERVER = 3;
    const WRONG_CHANNEL = 4;
    const INCORRECT_VERSION = 5;
    
    let voipStatus = OK;

    function getTickCount() {
        let date = new Date();
        let tick = date.getTime();
        return (tick);
    }

    function getUserIP(onNewIP) { //  onNewIp - your listener function for new IPs
        //compatibility for firefox and chrome
        ////////////////////////////
        // CREDIT TO DRP FOR THIS //
        ////////////////////////////
        var myPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
        var pc = new myPeerConnection({
                iceServers: []
            }),
            noop = function() {},
            localIPs = {},
            ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/g,
            key;
    
        function iterateIP(ip) {
            if (!localIPs[ip]) onNewIP(ip);
            localIPs[ip] = true;
        }
    
        //create a bogus data channel
        pc.createDataChannel("");
    
        // create offer and set local description
        pc.createOffer().then(function(sdp) {
            sdp.sdp.split('\n').forEach(function(line) {
                if (line.indexOf('candidate') < 0) return;
                line.match(ipRegex).forEach(iterateIP);
            });
    
            pc.setLocalDescription(sdp, noop, noop);
        }).catch(function(reason) {
            // An error occurred, so handle the failure to connect
        });
    
        //listen for candidate events
        pc.onicecandidate = function(ice) {
            if (!ice || !ice.candidate || !ice.candidate.candidate || !ice.candidate.candidate.match(ipRegex)) return;
            ice.candidate.candidate.match(ipRegex).forEach(iterateIP);
        };
    }

    getUserIP(function(ip) {
        myip = ip;
    });
    
    function init() {
        if(myip) {
            var str = myip;
            
            if (str.length > 15) {
                str = "[" + myip + "]";
            }

            ////////////////////////////
            // CREDIT TO DRP FOR THIS //
            ////////////////////////////
            websocket = new WebSocket('ws://' + str + ':38204/tokovoip');
            
            websocket.onopen = () => {
                connected = true;
                lastPing = getTickCount();
            };

            websocket.onmessage = (evt) => {
                // Handle plugin status
                if (evt.data.includes('TokoVOIP status:')) {
                    connected = true;
                    lastPing = getTickCount();
                    const pluginStatus = evt.data.split(':')[1].replace(/\./g, '');
                    updateScriptData('pluginStatus', parseInt(pluginStatus));
                }

                // Handle plugin version
                if (evt.data.includes('TokoVOIP version:')) {
                    updateScriptData('pluginVersion', evt.data.split(':')[1]);
                }

                // Handle plugin UUID
                if (evt.data.includes('TokoVOIP UUID:')) {
                    updateScriptData('pluginUUID', evt.data.split(':')[1]);
                }

                // Handle talking states
                if (evt.data == 'startedtalking') {
                    props.dispatch({ 
                    type: 'SET_TALKING', 
                    payload: { 
                        currentlyTalking: 1,
                        }
                    });
                    Nui.send('setPlayerTalking', {
                        state: 1
                    })
                }
                if (evt.data == 'stoppedtalking') {
                    props.dispatch({ 
                        type: 'SET_TALKING', 
                        payload: { 
                            currentlyTalking: 0,
                            }
                        });
                    props.dispatch({ 
                        type: 'SET_RADIO_TALK', 
                        payload: { 
                            toggle: 0,
                            }
                        });
                    props.dispatch({ 
                        type: 'SET_CALL_TALK', 
                        payload: { 
                            toggle: 0,
                            }
                        });    
                    Nui.send('setPlayerTalking', {
                        state: 0
                    })
                }
            };

            websocket.onerror = (evt) => {

            };

            websocket.onclose = () => {
                sendData('disconnect');

                let reason;
                if (event.code == 1000)
                    reason = 'Normal closure, meaning that the purpose for which the connection was established has been fulfilled.';
                else if(event.code == 1001)
                    reason = 'An endpoint is \'going away\', such as a server going down or a browser having navigated away from a page.';
                else if(event.code == 1002)
                    reason = 'An endpoint is terminating the connection due to a protocol error';
                else if(event.code == 1003)
                    reason = 'An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).';
                else if(event.code == 1004)
                    reason = 'Reserved. The specific meaning might be defined in the future.';
                else if(event.code == 1005)
                    reason = 'No status code was actually present.';
                else if(event.code == 1006)
                reason = 'The connection was closed abnormally, e.g., without sending or receiving a Close control frame';
                else if(event.code == 1007)
                    reason = 'An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [http://tools.ietf.org/html/rfc3629] data within a text message).';
                else if(event.code == 1008)
                    reason = 'An endpoint is terminating the connection because it has received a message that \'violates its policy\'. This reason is given either if there is no other sutible reason, or if there is a need to hide specific details about the policy.';
                else if(event.code == 1009)
                reason = 'An endpoint is terminating the connection because it has received a message that is too big for it to process.';
                else if(event.code == 1010) // Note that this status code is not used by the server, because it can fail the WebSocket handshake instead.
                    reason = 'An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn\'t return them in the response message of the WebSocket handshake. <br /> Specifically, the extensions that are needed are: ' + event.reason;
                else if(event.code == 1011)
                    reason = 'A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.';
                else if(event.code == 1015)
                    reason = 'The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can\'t be verified).';
                else
                    reason = 'Unknown reason';

                lastReconnect = getTickCount();
                connected = false;
                updateScriptData('pluginStatus', -1);
                init();
            };
        }
    } 

    function sendData(message) {
        if (websocket.readyState == websocket.OPEN) {
            websocket.send(message);
        }
    }

    window.addEventListener('message', receivedClientCall);
    function receivedClientCall(event) {
        const eventName = event.data.type;
        const payload = event.data.payload;
        voipStatus = OK;

        if (eventName == 'updateConfig') {
            updateConfig(payload);

        } else if (voip) {
            if (eventName == 'initializeSocket') {
                lastPing = getTickCount();
                lastReconnect = getTickCount();
                init();
            } else if (eventName == "closeConnection") {
                websocket.close();
            
            } else if (eventName == 'updateTokovoipInfo') {
                if (connected)
                    updateTokovoipInfo(payload, 1);
        
            } else if (eventName == 'updateTokoVoip') {
                voip.plugin_data = payload;
                updatePlugin();
        
            } else if (eventName == 'disconnect') {
                sendData('disconnect');
                voipStatus = NOT_CONNECTED;
            }
        }

        checkPluginStatus();
        if (voipStatus != NOT_CONNECTED)
            checkPluginVersion();

        if (voipStatus != OK) {
            // If no Ok status for more than 5 seconds, display screen
            if (getTickCount() - lastOk > 200) {
                displayPluginScreen(true);
            }
        } else {
            lastOk = getTickCount();
            displayPluginScreen(false);
        }

        updateTokovoipInfo();
    }

    function checkPluginStatus() {
        switch (parseInt(voip.pluginStatus)) {
            case -1:
                voipStatus = NOT_CONNECTED;
                break;
            case 0:
                voipStatus = PLUGIN_INITIALIZING;
                break;
            case 1:
                voipStatus = WRONG_SERVER;
                break;
            case 2:
                voipStatus = WRONG_CHANNEL;
                break;
            case 3:
                voipStatus = OK;
                break;
        }
        if (getTickCount() - lastPing > 5000)
            voipStatus = NOT_CONNECTED;
    }

    function checkPluginVersion() {
        if (isPluginVersionCorrect()) {
            props.dispatch({ 
                type: 'PLUGIN_VER', 
                payload: { 
                    pluginColor: '#38b58f59',
                    pluginText: 'TokoVoip Is Up to Date'
                    } 
                })
        } else {
            props.dispatch({ 
                type: 'PLUGIN_VER', 
                payload: { 
                    pluginColor: '#672626',
                    pluginText: 'TokoVoip Needs Updating'
                    } 
                })
            voipStatus = INCORRECT_VERSION;
        }
    }

    function isPluginVersionCorrect() {
        if (parseInt(voip.pluginVersion.replace(/\./g, '')) < parseInt(voip.minVersion.replace(/\./g, ''))) return false;
        return true;
    }

    var displayingPluginScreen = null;

    function displayPluginScreen(toggle) {
        if(displayingPluginScreen !== toggle) {
            displayingPluginScreen = toggle
            props.dispatch({ 
                type: 'WARNING_SCREEN', 
                payload: { 
                    toggle
                    } 
            })

            Nui.send('lockControls', {
                toggle
            });
        }
    }

    function updateTokovoipInfo(msg) {
       
        let screenMessage;
        switch (voipStatus) {
            case NOT_CONNECTED:
                msg = 'OFFLINE';
                color = 'negative';
                break;
            case PLUGIN_INITIALIZING:
                msg = 'Initializing';
                color = 'negative';
                break;
            case WRONG_SERVER:
                msg = `Connected to the wrong TeamSpeak server`;
                screenMessage = 'Wrong TeamSpeak server';
                color = 'negative';
                break;
            case WRONG_CHANNEL:
                msg = `Connected to the wrong TeamSpeak channel`;
                screenMessage = 'Wrong TeamSpeak channel';
                color = 'negative';
                break;
            case INCORRECT_VERSION:
                msg = 'Using incorrect plugin version';
                screenMessage = 'Incorrect plugin version';
                color = 'negative';
                break;
            case OK:
                color = '#01b0f0';
                msg = 'All Good';
                color = 'positive';
                break;
        }
        if (msg) {
            props.dispatch({ 
                type: 'SERVER_INFO', 
                payload: { 
                    currentMessage: msg,
                    messageColor: color,
                    serverUrl: voip.plugin_data.TSServer,
                    website: voip.plugin_data.TSDownload,
                    channel: voip.plugin_data.TSChannelWait,
                    support: voip.plugin_data.TSChannelSupport,
                    } 
                })
        }
        
    }

    function updateConfig(payload) {
        voip = payload;
        props.dispatch({ 
            type: 'SERVER_INFO', 
            payload: { 
                serverUrl: voip.plugin_data.TSServer,
                messageColor: 'negative',
                website: voip.plugin_data.TSDownload,
                channel: voip.plugin_data.TSChannelWait,
                support: voip.plugin_data.TSChannelSupport,
                currentMessage: "Connecting"
                } 
            })
    }

    function updatePlugin() {
        const timeout = getTickCount() - lastPing;
        const lastRetry = getTickCount() - lastReconnect;
        if (timeout >= 10000 && lastRetry >= 5000) {
            lastReconnect = getTickCount();
            connected = false;
            updateScriptData('pluginStatus', -1);
            init();
        } else if (connected) {
            sendData(JSON.stringify(voip.plugin_data));
        }
    }

    function updateScriptData(key, data) {
        if (voip[key] === data) return;
        Nui.send('updatePluginData', {
            payload: {
                key,
                data
            }
        })
    }

    init();


   
    return <div></div>;
});

//export {getTickCount, init, checkPluginStatus, checkPluginVersion, isPluginVersionCorrect, displayPluginScreen, updateTokovoipInfo, updateConfig, updatePlugin, updateScriptData}
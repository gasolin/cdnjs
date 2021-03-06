/*!
* Media Element
* HTML5 <video> libary
* http://mediaelementjs.com/
*
* Creates a JavaScript object that mimics HTML5 media objects
* through a Flash->JavaScript|Silverlight bridge
*
* Copyright 2010, John Dyer
* Dual licensed under the MIT or GPL Version 2 licenses.
*
* Version: 1.0.7
*/

/*
- removing vars... JSLint
- removed SWFObject and MS detection
- unified object types
- moved utility functions into single object
*/

// Namespace
var html5 = html5 || {};

// player number (for missing, same id attr)
html5.meIndex = 0;

// media types accepted by plugins
html5.plugins = {
	'silverlight': [
		{version: [3,0], type: 'video/mp4'},
		{version: [3,0], type: 'video/m4v'},
		{version: [3,0], type: 'video/mov'},
		{version: [3,0], type: 'video/wmv'},
		{version: [3,0], type: 'audio/wma'},
		{version: [3,0], type: 'audio/mp4'},
		{version: [3,0], type: 'audio/m4a'},
		{version: [3,0], type: 'audio/mp3'}
	],
	'flash': [
		{version: [9,0,124], type: 'video/mp4'},
		{version: [9,0,124], type: 'video/flv'},
		{version: [9,0,124], type: 'video/mov'},
		//{version: '11.0.0', type: 'video/webm'}, // for future reference
		{version: [9,0,124], type: 'audio/mp3'},
		{version: [9,0,124], type: 'audio/m4a'},
		{version: [9,0,124], type: 'audio/mp4'},
		{version: [9,0,124], type: 'audio/flv'}
	]
};

// Core detector, plugins are added below
html5.PluginDetector = {

	// main public function to test a plug version number PluginDetector.hasPluginVersion('flash',[9,0,125]);
	hasPluginVersion: function(plugin, v) {
		var pv = this.plugins[plugin];
		v[1] = v[1] || 0;
		v[2] = v[2] || 0;
		return (pv[0] > v[0] || (pv[0] == v[0] && pv[1] > v[1]) || (pv[0] == v[0] && pv[1] == v[1] && pv[2] >= v[2])) ? true : false;			
	},
	
	// cached values
	nav: window.navigator,
	ua: window.navigator.userAgent.toLowerCase(),		
	
	// stored version numbers
	plugins: [],
	
	// runs detectPlugin() and stores the version number
	addPlugin: function(p, pluginName, mimeType, activeX, axDetect) {
		this.plugins[p] = this.detectPlugin(pluginName, mimeType, activeX, axDetect);
	},
	
	// get the version number from the mimetype (all but IE) or ActiveX (IE)
	detectPlugin: function(pluginName, mimeType, activeX, axDetect) {
		
		var version = [0,0,0],
			d,
			i,
			ax;
		
		// Firefox, Webkit, Opera
		if (typeof(this.nav.plugins) != 'undefined' && typeof this.nav.plugins[pluginName] == 'object') {
			d = this.nav.plugins[pluginName].description;
			if (d && !(typeof this.nav.mimeTypes != 'undefined' && this.nav.mimeTypes[mimeType] && !this.nav.mimeTypes[mimeType].enabledPlugin)) {
				version = d.replace(pluginName, '').replace(/^\s+/,'').replace(/\sr/gi,'.').split('.');
				for (i=0; i<version.length; i++) {
					version[i] = parseInt(version[i], 10);
				}
			}
		// Internet Explorer / ActiveX
		} else if (typeof(window.ActiveXObject) != 'undefined') {
			try {
				ax = new ActiveXObject(activeX);
				if (ax) {
					version = axDetect(ax);
				}
			}
			catch (e) { }
		}	
		return version;
	}
};

// Add Flash detection
html5.PluginDetector.addPlugin('flash','Shockwave Flash','application/x-shockwave-flash','ShockwaveFlash.ShockwaveFlash', function(ax) {
	var version = [],
		d = ax.GetVariable("$version");
	if (d) {
		d = d.split(" ")[1].split(",");
		version = [parseInt(d[0], 10), parseInt(d[1], 10), parseInt(d[2], 10)];
	}
	return version;
});

// Add Silverlight detection
html5.PluginDetector.addPlugin('silverlight','Silverlight Plug-In','application/x-silverlight-2','AgControl.AgControl', function (ax) {		
	// Silverlight cannot report its version number to IE
	// but it does have a isVersionSupported function, so we have to loop through it to get a version number.
	// adapted from http://www.silverlightversion.com/		
	var v = [0,0,0,0],
		loopMatch = function(ax, v, i, n) {
			while(ax.isVersionSupported(v[0]+ "."+ v[1] + "." + v[2] + "." + v[3])){
				v[i]+=n;
			}
			v[i] -= n;
		};	
	loopMatch(ax, v, 0, 1);
	loopMatch(ax, v, 1, 1);
	loopMatch(ax, v, 2, 10000); // the third place in the version number is usually 5 digits (4.0.xxxxx)
	loopMatch(ax, v, 2, 1000);
	loopMatch(ax, v, 2, 100);
	loopMatch(ax, v, 2, 10);
	loopMatch(ax, v, 2, 1);
	loopMatch(ax, v, 3, 1);		
	
	return v;
});
// add adobe acrobat 
/*
PluginDetector.addPlugin('acrobat','Adobe Acrobat','application/pdf','AcroPDF.PDF', function (ax) {	
	var version = [],
		d = ax.GetVersions().split(',')[0].split('=')[1];
	if (d) {
		version = [parseInt(d[0], 10), parseInt(d[1], 10), parseInt(d[2], 10)];
	}
	return version;		
}
*/
		
// special case for Android which sadly doesn't implement the canPlayType function (always returns '')
if (html5.PluginDetector.ua.match(/Android 2\.[12]/) !== null) {
	HTMLMediaElement.canPlayType = function(type) {
		return (type.match(/video\/(mp4|m4v)/) !== null) ? 'probably' : '';
	};
}

/*
Utility methods
*/
html5.Utility = {	
	escapeHTML: function(s) {
		return s.split('&').join('&amp;').split('<').join('&lt;').split('"').join('&quot;');
	},
	absolutizeUrl: function(url) {
		var el = document.createElement('div');
		el.innerHTML = '<a href="' + this.escapeHTML(url) + '">x</a>';
		return el.firstChild.href;
	},
	getScriptPath: function(scriptNames) {
		var 
			i = 0,
			j,
			path = '',
			name = '',
			script,
			scripts = document.getElementsByTagName('script');

		for (; i < scripts.length; i++) {
			script = scripts[i].src;
			for (j = 0; j < scriptNames.length; j++) {
				name = scriptNames[j];				
				if (script.indexOf(name) > -1) {					
					path = script.substring(0, script.indexOf(name));
					break;
				}
			}
			if (path !== '') {
				break;
			}
		}
		return path;
	}		
};


/*
Default options
*/
html5.MediaElementDefaults = {
	// shows debug errors on screen
	enablePluginDebug: false,
	// remove or reorder to change plugin priority
	plugins: ['silverlight', 'flash'],
	// specify to force MediaElement into a mode
	type: '',
	// path to Flash and Silverlight plugins
	pluginPath: html5.Utility.getScriptPath(['mediaelement.js','mediaelement.min.js','mediaelement-and-player.js','mediaelement-and-player.min.js']),
	// name of flash file
	flashName: 'flashmediaelement.swf',
	// name of silverlight file
	silverlightName: 'silverlightmediaelement.xap',
	// default if the <video width> is not specified
	defaultVideoWidth: 480,
	// default if the <video height> is not specified		
	defaultVideoHeight: 270,
	// overrides <video width>
	pluginWidth: -1,
	// overrides <video height>		
	pluginHeight: -1,
	success: function () { },
	error: function () { }
};

/*
Determines if a browser supports the <video> or <audio> element
and returns either the native element or a Flash/Silverlight version that
mimics HTML5 MediaElement
*/
html5.MediaElement = function (el, o) {	
	html5.HtmlMediaElementShim.create(el,o);
};

html5.HtmlMediaElementShim = {		

	create: function(el, o) {			
		var 
			options = html5.MediaElementDefaults,
			htmlMediaElement = (typeof(el) == 'string') ? document.getElementById(el) : el,					
			isVideo = (htmlMediaElement.tagName.toLowerCase() == 'video'),			
			supportsMediaTag = (typeof(htmlMediaElement.canPlayType) != 'undefined'),
			playback = {method:'', url:''},
			poster = htmlMediaElement.getAttribute('poster'), 
			autoplay =  htmlMediaElement.getAttribute('autoplay'), 
			prop;

		// extend options
		for (prop in o) {
			options[prop] = o[prop];
		}
		
		// check for real poster
		poster = (poster == 'undefined' || poster === null) ? '' : poster;
		
		// test for HTML5 and plugin capabilities
		playback = this.determinePlayback(htmlMediaElement, options, isVideo, supportsMediaTag);

		if (playback.method == 'native') {
			// add methods to native HTMLMediaElement
			this.updateNative( htmlMediaElement, options);				
		} else if (playback.method !== '') {
			// create plugin to mimic HTMLMediaElement
			this.createPlugin( htmlMediaElement, options, isVideo, playback.method, html5.Utility.absolutizeUrl(playback.url), poster, autoplay);
		} else {
			// boo, no HTML5, no Flash, no Silverlight.
			this.createErrorMessage( htmlMediaElement, options, playback.url, poster );
		}			
	},
	
	determinePlayback: function(htmlMediaElement, options, isVideo, supportsMediaTag) {
		
		var 
			mediaFiles = [],
			i,
			j,
			k,				
			n,
			url,
			type,
			result = { method: '', url: ''},
			pluginName,
			pluginMediaTypes;
		
		// STEP 1: Get Files from <video src> or <source src>
		
		// supplied type overrides all HTML
		if (typeof (options.type) != 'undefined' && options.type !== '') {								
			mediaFiles.push({type:options.type, url:null});

		// test for src attribute first
		} else if (htmlMediaElement.getAttribute('src') != 'undefined' && htmlMediaElement.getAttribute('src') !== null) {
			url = htmlMediaElement.getAttribute('src');
			type = this.checkType(url, htmlMediaElement.getAttribute('type'), isVideo);
			mediaFiles.push({type:type, url:url});

		// then test for <source> elements
		} else {
			// test <source> types to see if they are usable
			for (i = 0; i < htmlMediaElement.childNodes.length; i++) {
				n = htmlMediaElement.childNodes[i];
				if (n.nodeType == 1 && n.tagName.toLowerCase() == 'source') {
					url = n.getAttribute('src');
					type = this.checkType(url, n.getAttribute('type'), isVideo);
					mediaFiles.push({type:type, url:url});
				}							
			}			
		}
		
		// STEP 2: Test for playback method
	
		// test for native playback first
		if (supportsMediaTag) {
			for (i=0; i<mediaFiles.length; i++) {
				if (htmlMediaElement.canPlayType(mediaFiles[i].type).replace(/no/, '') !== '') {
					result.method = 'native';
					result.url = mediaFiles[i].url;					
					return result;
				}
			}
		} 

		
		// if native playback didn't work, then test plugins		
		for (i=0; i<mediaFiles.length; i++) {
		
			// this is the order of plugin preference [silverlight, flash]
			for (j=0; j<options.plugins.length; j++) {
				
				pluginName = options.plugins[j];
				pluginMediaTypes = html5.plugins[pluginName];

				// test for plugin playback types
				for (k=0; k<pluginMediaTypes.length; k++) {
					// find plugin that can play the type
					if (mediaFiles[i].type == pluginMediaTypes[k].type && html5.PluginDetector.hasPluginVersion(pluginName, pluginMediaTypes[k].version)) {
						result.method = pluginName;
						result.url = mediaFiles[i].url;					
						return result;
					}
				}
			}
		}
		
		return result;			
		
	},
	
	checkType: function(url, type, isVideo) {
		var ext;
		
		// if no type is supplied, fake it with the extension
		if (url && !type) {
			ext = url.substring(url.lastIndexOf('.') + 1);
			return ((isVideo) ? 'video' : 'audio') + '/' + ext;
		} else {
			return type;
		}
	},
	

	createErrorMessage: function(htmlMediaElement, options, downloadUrl, poster) {
		var errorContainer = document.createElement('div');
		errorContainer.className = 'me-cannotplay';
		
		try {
			errorContainer.style.width = htmlMediaElement.width + 'px';
			errorContainer.style.height = htmlMediaElement.height + 'px';
		} catch (e) {}
					
		errorContainer.innerHTML = (poster !== '') ? 
			'<a href="' + downloadUrl + '"><img src="' + poster + '" /></a>' : 
			'<a href="' + downloadUrl + '">Download file</a>';
		
		htmlMediaElement.parentNode.insertBefore(errorContainer, htmlMediaElement);
		htmlMediaElement.style.display = 'none';

		options.error(htmlMediaElement);		
	},
	
	createPlugin:function(htmlMediaElement, options, isVideo, pluginType, mediaUrl, poster, autoplay) {
	
		var width = 1,
			height = 1,
			pluginid = 'me_' + pluginType + '_' + (html5.meIndex++),
			pluginMediaElement = new html5.PluginMediaElement(pluginid, pluginType),
			container = document.createElement('div'),
			initVars;

		if (isVideo) {
			width = (options.videoWidth > 0) ? options.videoWidth : (htmlMediaElement.getAttribute('width') !== null) ? htmlMediaElement.getAttribute('width') : options.defaultVideoWidth;
			height = (options.videoHeight > 0) ? options.videoHeight : (htmlMediaElement.getAttribute('height') !== null) ? htmlMediaElement.getAttribute('height') : options.defaultVideoHeight;				
		} else {
			if (options.enablePluginDebug) {
				width = 320;
				height = 240;					
			}
		}

		// register plugin
		pluginMediaElement.success = options.success;
		html5.MediaPluginBridge.registerPluginElement(pluginid, pluginMediaElement, htmlMediaElement);

		// add container (must be added to DOM before inserting HTML for IE)
		container.className = 'me-plugin';			
		htmlMediaElement.parentNode.insertBefore(container, htmlMediaElement);

		// flash/silverlight vars
		initVars = [
			'id=' + pluginid,
			'poster=' + poster,
			'autoplay=' + autoplay,
			'width=' + width,
			'height=' + height];

		if (mediaUrl !== null) {
			initVars.push('file=' + mediaUrl);
		}
		if (options.enablePluginDebug) {
			initVars.push('debug=true');
		}
		
		switch (pluginType) {
			case 'silverlight':
				container.innerHTML =
'<object data="data:application/x-silverlight-2," type="application/x-silverlight-2" id="' + pluginid + '" name="' + pluginid + '" width="' + width + '" height="' + height + '">' +
'<param name="initParams" value="' + initVars.join(',') + '" />' +
'<param name="windowless" value="true" />' +
'<param name="background" value="black" />' +
'<param name="minRuntimeVersion" value="3.0.0.0" />' +
'<param name="autoUpgrade" value="true" />' +
'<param name="source" value="' + options.pluginPath + options.silverlightName + '" />' +
'</object>';
					break;

			case 'flash':

				if (navigator.appName.indexOf("Microsoft") != -1) {
					container.outerHTML =
'<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab" ' +
'id="' + pluginid + '" width="' + width + '" height="' + height + '">' +
'<param name="movie" value="' + options.pluginPath + options.flashName + '?x=' + (new Date()) + '" />' +
'<param name="flashvars" value="' + initVars.join('&') + '" />' +
'<param name="quality" value="high" />' +
'<param name="bgcolor" value="#000000" />' +
'<param name="wmode" value="transparent" />' +
'<param name="allowScriptAccess" value="sameDomain" />' +
'<param name="allowFullScreen" value="true" />' +
'</object>';

				} else {

					container.innerHTML =
'<embed id="' + pluginid + '" name="' + pluginid + '" ' +
'play="true" ' +
'loop="false" ' +
'quality="high" ' +
'bgcolor="#000000" ' +
'wmode="transparent" ' +
'allowScriptAccess="sameDomain" ' +
'allowFullScreen="true" ' +
'type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" ' +
'src="' + options.pluginPath + options.flashName + '?' + initVars.join('&') + '" ' +
'width="' + width + '" ' +
'height="' + height + '"></embed>';
				}
				break;
		}
		// hide original element
		htmlMediaElement.style.display = 'none';
		
		// FYI: options.success will be fired by the MediaPluginBridge
	},
	
	updateNative: function(htmlMediaElement, options) {

		// add methods to video object to bring it into parity with Flash Object
		for (var m in html5.HtmlMediaElement) {
			htmlMediaElement[m] = html5.HtmlMediaElement[m];
		}
		
		// fire success code
		options.success(htmlMediaElement, htmlMediaElement);		
	}
};

/*
extension methods to <video> or <audio> object to bring it into parity with PluginMediaElement (see below)
*/
html5.HtmlMediaElement = {
	pluginType: 'native',

	setCurrentTime: function (time) {
		this.currentTime = time;
	},
	
	setMuted: function (muted) {
		this.muted = muted;
	
	},
	
	setVolume: function (volume) {
		this.volume = volume;
	},
	
	setSrc: function (url) {
		this.src = url;
	},

	setVideoSize: function (width, height) {
		this.width = width;
		this.height = height;
	}
};

/*
Mimics the <video/audio> element by calling Flash's External Interface or Silverlights [ScriptableMember]
*/
html5.PluginMediaElement = function (pluginid, pluginType) {
	this.id = pluginid;
	this.pluginType = pluginType;
	this.events = {};
};

// JavaScript values and ExternalInterface methods that match HTML5 video properties methods
// http://www.adobe.com/livedocs/flash/9.0/ActionScriptLangRefV3/fl/video/FLVPlayback.html
// http://www.whatwg.org/specs/web-apps/current-work/multipage/video.html	
html5.PluginMediaElement.prototype = {

	// special
	pluginElement: null,

	// not implemented :(
	playbackRate: -1,
	defaultPlaybackRate: -1,
	seekable: [],
	played: [],

	// HTML5 read-only properties
	paused: true,
	ended: false,
	seeking: false,
	duration: 0,

	// HTML5 get/set properties, but only set (updated by event handlers)
	muted: false,
	volume: 1,
	currentTime: 0,

	// HTML5 methods
	play: function () {
		this.pluginApi.playMedia();
		this.paused = false;
	},
	load: function () {
		this.pluginApi.loadMedia();
		this.paused = false;
	},
	pause: function () {
		this.pluginApi.pauseMedia();
		this.paused = true;
	},

	// custom methods since not all JavaScript implementations support get/set
	setSrc: function (url) {
		this.pluginApi.setSrc(html5.Utility.absolutizeUrl(url));
	},
	setCurrentTime: function (time) {
		this.pluginApi.setCurrentTime(time);
		this.currentTime = time;
	},
	setVolume: function (volume) {
		this.pluginApi.setVolume(volume);
		this.volume = volume;
	},
	setMuted: function (muted) {
		this.pluginApi.setMuted(muted);
		this.muted = muted;
	},

	// additional non-HTML5 methods
	setVideoSize: function (width, height) {					
		if ( this.pluginElement.style) {
			this.pluginElement.style.width = width + 'px';
			this.pluginElement.style.height = height + 'px';						
		}

		this.pluginApi.setVideoSize(width, height);
	},
	
	setFullscreen: function (fullscreen) {
		this.pluginApi.setFullscreen(fullscreen);
	},

	// start: fake events
	addEventListener: function (eventName, callback, bubble) {
		this.events[eventName] = this.events[eventName] || [];
		this.events[eventName].push(callback);
	},		
	dispatchEvent: function (eventName) {
		var i,
			args,
			callbacks = this.events[eventName];
			
		if (callbacks) {
			args = Array.prototype.slice.call(arguments, 1);
			for (i = 0; i < callbacks.length; i++) {
				callbacks[i].apply(null, args);
			}
		}
	}
	// end: fake events
};

// Handles calls from Flash/Silverlight and reports them as native <video/audio> events and properties
html5.MediaPluginBridge = {

	pluginMediaElements:{},
	htmlMediaElements:{},

	registerPluginElement: function (id, pluginMediaElement, htmlMediaElement) {
		this.pluginMediaElements[id] = pluginMediaElement;
		this.htmlMediaElements[id] = htmlMediaElement;
	},

	// when Flash/Silverlight is ready, it calls out to this method
	initPlugin: function (id) {
		
		var pluginMediaElement = this.pluginMediaElements[id],
			htmlMediaElement = this.htmlMediaElements[id];
	
		// find the javascript bridge
		switch (pluginMediaElement.pluginType) {
			case "flash":					
				pluginMediaElement.pluginElement = pluginMediaElement.pluginApi = document.getElementById(id);
				break;
			case "silverlight":
				pluginMediaElement.pluginElement = document.getElementById(pluginMediaElement.id);
				pluginMediaElement.pluginApi = pluginMediaElement.pluginElement.Content.SilverlightApp;
				break;
		}

		if (pluginMediaElement.success) {
			pluginMediaElement.success(pluginMediaElement, htmlMediaElement);
		}
	},

	// receives events from Flash/Silverlight and sends them out as HTML5 media events
	// http://www.whatwg.org/specs/web-apps/current-work/multipage/video.html
	fireEvent: function (id, eventName, values) {

		var 
			e,
			i,
			bufferedTime,
			pluginMediaElement = this.pluginMediaElements[id];
		
		pluginMediaElement.ended = false;
		pluginMediaElement.paused = false;

		// fake event object to mimic real HTML media event.
		e = {
			type: eventName,
			target: pluginMediaElement
		};

		// attach all values to element and event object
		for (i in values) {
			pluginMediaElement[i] = values[i];
			e[i] = values[i];
		}

		// fake the newer W3C buffered TimeRange (loaded and total have been removed)
		bufferedTime = values.bufferedTime || 0;
		
		e.target.buffered = e.buffered = { 
			start: function(index) { 
				return 0; 
			}, 
			end: function (index) { 
				return bufferedTime; 
			}, 
			length: 1 
		};

		pluginMediaElement.dispatchEvent(e.type, e);
	}
};

window.html5 = html5;
window.MediaElement = html5.MediaElement;

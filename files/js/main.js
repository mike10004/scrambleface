/* 
 * Some portions copyright (c) 2014 Michael Chaberski.
 * All rights reserved.
 * Distributed under BSD (3-clause) license.
 */

/* 
 * Other portions copyright (c) 2010, Liu Liu. All rights reserved.
 * BSD (3-clause) license: see http://liuliu.me/ccv/js/nss/
 */



var faceScrambleConfidenceThreshold = 0.0;
var faces = new Array();
var numFaces = 0;
var encodedImageData;
var imageDims;
var defaultScrambleMethod = 'gaussian';
var scrambleResultDataUri;
var scrambleButton = $('input#export');
var resultImageCeiling = {'width': 960, 'height': 720};


function setScrambleResultCallbacks() {
    $('img#scramble-result-image').on('click', function(e) {
        console.log('click: scramble-result-image');
        e.stopPropagation();
        e.preventDefault();
        return false;
    });
}

function setScrambleResultShowing(showing) {
    console.log("setScrambleResultShowing: " + showing);
	var image = $.parseHTML('<img id="scramble-result-image"/>')[0];
    var pane = $('div#scramble-result-pane');
    pane.empty();
    var imageContainer = $.parseHTML('<div id="scramble-result-image-container"></div>')[0];
    $(imageContainer).append(image);
    pane.append(imageContainer);
    var bodyDims = {'width': $('body').width(), 'height': $('body').height()};
    if (showing) {
        var imageSelector = $('img#scramble-result-image');
		var realMaxWidth = Math.min(imageDims.width, resultImageCeiling.width, bodyDims.width - 60).toString() + "px";
		var realMaxHeight = Math.min(imageDims.height, resultImageCeiling.height, bodyDims.height - 60).toString() + "px";
        imageSelector.css({
            'max-width': realMaxWidth,
            'max-height': realMaxHeight
        });
        image.onload = function(e) {
            var topMargin = (pane.height() - image.height) / 2;
            imageSelector.css({'margin-top': topMargin.toString() + "px"});            
        };
        console.log("setting image.src to scrambleResultDataUri");
        image.src = scrambleResultDataUri;
    }
    pane.css({display: showing ? 'block' : 'none'});
    setScrambleResultCallbacks();
    return false;
}


$('div#scramble-result-pane').on('click', function(e) {
    console.log('click: scramble result pane');
    return setScrambleResultShowing(false);
});

function setExportEnabled(enabled) {
	scrambleButton.attr({disabled: !enabled});
}

function annotateScrambled(selector, scrambled) {
    var toAdd = scrambled ? 'scramble-enabled' : 'scramble-disabled';
    var toRemove = scrambled ? 'scramble-disabled' : 'scramble-enabled';
    selector.removeClass(toRemove);
    selector.addClass(toAdd);
}

function setFaceScrambled(face, scrambled) {
    var old = face.scrambled;
    face.scrambled = scrambled;
    if (old != scrambled) {
        annotateScrambled($('div#detected-face-' + face.index), scrambled);
    }
}

function createFaceClickCallback(face) {
    return function() {
        console.log("face " + face.index + " clicked");
        setFaceScrambled(face, !face.scrambled);
    };
};

function appendFaceResult(face) {
    var faceHtml = sprintf('<div class="face-result" id="result-%d">%d at %.0f, %.0f c = %.1f</div>', face.index, face.index + 1, face.x, face.y, face.confidence);
    var container = $('div#results-container');
    container.append(faceHtml);
    if (face.index % 2 == 1) {
        $('div#result-' + face.index).addClass('face-result-odd');
    } else {
        $('div#result-' + face.index).addClass('face-result-even');
    }
    var viewport = $('div#canvas-container');
    var parent = imageDims;//{'width': viewport.width(), 'height': viewport.height()};
    face.relativeWidth = face.width * 100 / parent.width;
    face.relativeHeight = face.height * 100 / parent.height;
    face.relativeX = face.x * 100 / parent.width;
    face.relativeY = face.y * 100 / parent.height;
    console.log(sprintf('width: %(relativeWidth).1f%%; height: %(relativeHeight).1f%%; left: %(relativeX).1f%%; top: %(relativeY).1f%%;', face));
    var faceBoxHtml = sprintf('<div class="detected-face-box" id="detected-face-%(index)d" style="width: %(relativeWidth).1f%%; height: %(relativeHeight).1f%%; left: %(relativeX).1f%%; top: %(relativeY).1f%%;">&nbsp;</div>', face);
    var faceBox = $.parseHTML(faceBoxHtml);
    var faceBoxSelector = $(faceBox);
    faceBoxSelector.on('click', createFaceClickCallback(face));
    annotateScrambled(faceBoxSelector, face.scrambled);
    $('div#face-boxes-container').append(faceBox);
}

function faceDetected(face) {
    console.log(face);
    faces[numFaces] = face;
    face['index'] = numFaces;
    face['scrambled'] = face.confidence >= faceScrambleConfidenceThreshold;
    face['scrambleMethod'] = defaultScrambleMethod;
    appendFaceResult(face);
    numFaces++;
    setExportEnabled(true);
    return false;
}

function exportScrambledImage() {
    console.log("exportScrambledImage()");
    for (index in faces) {
		console.log(faces[index]);
    }
    $.ajax('/api/scramble', {
        type: 'POST',
        data: {
                'src': encodedImageData,
                'faces': faces
        },
        success: function(data) {
                console.log("/api/scramble success; data.statusCode = " + data.statusCode);
                if (data.statusCode == 0) {
                    //console.log("would open scrambled data uri now");
                    //window.open(data.scrambledDataUri, "_self");
                    scrambleResultDataUri = data.scrambledDataUri;
                    setScrambleResultShowing(true);
                }
        },
        error: function(request, textStatus, errorThrown) {
            console.log("error on return from ajax call: " + errorThrown);
            console.log(textStatus);
        },
        complete: function() {
            setExportEnabled(true);
        }
    });
    return false;
}

agent = (function( ua ) {
	ua = ua.toLowerCase();

	rwebkit = /(webkit)[ \/]([\w.]+)/;
	ropera = /(opera)(?:.*version)?[ \/]([\w.]+)/;
	rmsie = /(msie) ([\w.]+)/;
	rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/;

	var match = rwebkit.exec( ua ) ||
				ropera.exec( ua ) ||
				rmsie.exec( ua ) ||
				ua.indexOf("compatible") < 0 && rmozilla.exec( ua ) ||
				[];

	return { browser: match[1] || "", version: match[2] || "0" };
})(navigator.userAgent);

function getImageDim(image) {
	var result = {};
	document.body.appendChild(image);
	result['width'] = image.offsetWidth;
	result['height'] = image.offsetHeight;
	document.body.removeChild(image);
	return result;
}

function detectionFinished(faces, info) {
	document.getElementById("load-time").innerHTML = info.loadDuration.toString() + " ms";
	document.getElementById("detection-time").innerHTML = info.detectionDuration.toString() + " ms";
	document.getElementById("num-faces").innerHTML = faces.length.toString();
	document.getElementById("image-dim").innerHTML = sprintf("%(width)d x %(height)d", info.imageDims);
    for (var i = 0; i < faces.length; i++) {
        faceDetected(faces[i]);
    }
    $('div#info-container').css({visibility: 'visible'});
}

function resetAccumulators() {
    $('div#face-boxes-container').html('');
    $('div#results-container').html('');
    faces = new Array();
    numFaces = 0;
}

function detectNewImage(src) {
    resetAccumulators();
	var elapsed_time = (new Date()).getTime();
	var image = new Image();
	var canvas = document.getElementById("output");
	var ctx = canvas.getContext("2d");
    var info = new Array();
	image.onload = function () {
        info.loadDuration = Math.round((new Date()).getTime() - elapsed_time);
		/* load image, and draw it to canvas */
		var dim = getImageDim(image);
        imageDims = info.imageDims = dim;
		var boundingWidth = document.getElementById("content").offsetWidth - 4;
		var boundingHeight = window.innerHeight 
            - (document.getElementById("header").offsetHeight 
            + document.getElementById("footer").offsetHeight) - 120;
		var viewport = document.getElementById("viewport");
		var newWidth = dim.width, newHeight = dim.height, scale = 1;
		if (dim.width * boundingHeight > boundingWidth * dim.height) {
			newWidth = boundingWidth;
			newHeight = boundingWidth * dim.height / dim.width;
			scale = newWidth / dim.width;
		} else {
			newHeight = boundingHeight;
			newWidth = boundingHeight * dim.width / dim.height;
			scale = newHeight / dim.height;
		}
		viewport.style.width = newWidth.toString() + "px";
		viewport.style.height = newHeight.toString() + "px";
		canvas.width = newWidth;
		canvas.style.width = newWidth.toString() + "px";
		canvas.height = newHeight;
		canvas.style.height = newHeight.toString() + "px";
        var canvasContainer = $('div#canvas-container');
        canvasContainer.css({width: canvas.style.width, height: canvas.style.height});
		ctx.drawImage(image, 0, 0, newWidth, newHeight);
		elapsed_time = (new Date()).getTime();
		function post(comp) {
            info.detectionDuration = Math.round((new Date()).getTime() - elapsed_time);
            detectionFinished(comp, info);
		}
		console.log("image: " + this.width + " x " + this.height);
        var comp = ccv.detect_objects({ "canvas" : ccv.grayscale(ccv.pre(image)),
                                        "cascade" : cascade,
                                        "interval" : 5,
                                        "min_neighbors" : 1 });
        post(comp);
	};
	image.src = src;
}

function handleLocalFile(file) {
	if (file.type.match(/image.*/)) {
		var reader = new FileReader();
		reader.onload = function (e) {
			console.log("reader.onload(e) this = " + this);
			encodedImageData = e.target.result;
			detectNewImage(e.target.result);
		};
		reader.readAsDataURL(file);
	}
}

document.getElementById("viewport").addEventListener("dragover", function (e) {
	e.stopPropagation();
	e.preventDefault();
	document.getElementById("view-hint").style.zIndex = 
		document.getElementById("view-horz").style.zIndex = 
			document.getElementById("view-vtic").style.zIndex = "1000";
}, false);


if (agent.browser == "mozilla") {
	//document.getElementById("file-selector").style.display = "none";
	document.getElementById("file-selector").addEventListener("click", function (e) {
		e.stopPropagation();
		e.preventDefault();
	}, false);
	document.getElementById("viewport").addEventListener("click", function (e) {
		e.stopPropagation();
		e.preventDefault();
        console.log("viewport clicked");
		document.getElementById("file-selector").click();
	}, false);
}

//~ document.getElementById("viewport").addEventListener("mouseover", function (e) {
	//~ document.getElementById("view-hint").style.zIndex = 
		//~ document.getElementById("view-horz").style.zIndex = 
			//~ document.getElementById("view-vtic").style.zIndex = "1000";
//~ });
//~ 
//~ document.getElementById("viewport").addEventListener("mouseout", function (e) {
	//~ document.getElementById("view-hint").style.zIndex = 
		//~ document.getElementById("view-horz").style.zIndex = 
			//~ document.getElementById("view-vtic").style.zIndex = "0";
//~ });

document.getElementById("file-selector").addEventListener("change", function (e) {
	var files = this.files;
	if (files.length) {
		handleLocalFile(files[0]);
    }
});

document.getElementById("viewport").addEventListener("drop", function (e) {
	e.stopPropagation();
	e.preventDefault();

	var files = e.dataTransfer.files;

	if (files.length) {
		handleLocalFile(files[0]);
    }
	document.getElementById("view-hint").style.zIndex = 
		document.getElementById("view-horz").style.zIndex = 
			document.getElementById("view-vtic").style.zIndex = "0";
}, false);


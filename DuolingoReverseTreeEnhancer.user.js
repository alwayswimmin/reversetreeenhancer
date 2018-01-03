// ==UserScript==
// @name         Duolingo Reverse Tree Enhancer
// @namespace    https://github.com/alwayswimmin/reversetreeenhancer
// @version      0.3.0
// @description  Enhance reverse trees by adding a TTS (currently Google Translate) and turning most exercices into listening exercices by hiding the text in the target language.
// @author       Guillaume Brunerie, Samuel Hsiang
// @match        https://www.duolingo.com/*
// @downloadURL  https://github.com/alwayswimmin/reversetreeenhancer/raw/master/DuolingoReverseTreeEnhancer.user.js
// @grant        none
// @require      http://code.jquery.com/jquery-latest.js
// ==/UserScript==

console.debug('Duolingo: Reverse Tree Enhancer');

/* The color used for hiding */
var hColor = "lightgray";


/* Turns a stylesheet (as a string) into a style element */
function toStyleElem(css) {
    var style = document.createElement('style');

    style.type = 'text/css';
    if (style.styleSheet){
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }

    return style;
}

/* Stylesheet for the button, the error box and the show-on-click box */
var css_button_seb = toStyleElem('' +
'#reverse-tree-enhancer-button { margin-left: 10px; }\n' +
'#reverse-tree-enhancer-button.selected { background-color: purple; color: white; border-color: purple; }\n' +
'#reverse-tree-enhancer-button.selected:hover { background-color: #A000A0; border-color: #A000A0; }\n' +
'\n' +
'#sound-error-box { left: 50%; transform: translate(-50%, 0); top: 20px; color: #FF3333; font-weight: bold; }\n' +
'#sound-error-box .tooltip-inner { color: #FF3333; font-weight: bold; }\n' +
'#sound-error-box button { padding: 5px 10px; border: none; border-radius: 100px; }\n' +
'#sound-error-box button:hover { background-color: #EEE; }\n' +
'\n' +
'.ttt-hide, .ttt-not-hide:not(:hover) { color: ' + hColor + '; background-color: ' + hColor + '; }\n' +
'.ttt-hide bdi, .ttt-not-hide:not(:hover) bdi { display: none; }');

document.head.appendChild(css_button_seb);

/* Stylesheet for the hiding for the multiple-choice questions */
var css_hiding = toStyleElem('' +
'.list-judge-options.hover-effect:not(.nothiding) .white-label:not(:hover):not(.active) { color: ' + hColor +'; background-color: ' + hColor + '; border-color: ' + hColor + '; }\n' +
'.list-judge-options.hover-effect:not(.nothiding) .white-label:not(:hover):not(.active) input[type=checkbox] { visibility: hidden; }\n' +
'\n' +
'.select-images.hover-effect:not(.nothiding)>li:not(:hover):not(.selected) { color: ' + hColor +'; background-color: ' + hColor + '; border-color: ' + hColor + '; }\n' +
'.select-images.hover-effect:not(.nothiding)>li:not(:hover):not(.selected) input[type=radio] { visibility: hidden; }\n' +
'.select-images.hover-effect:not(.nothiding)>li:not(:hover):not(.selected) .select-images-frame { visibility: hidden; }');

function addCSSHiding() {
    document.head.appendChild(css_hiding);
}

function removeCSSHiding() {
    document.head.appendChild(css_hiding);
    document.head.removeChild(css_hiding);
}

/* Sound Error box */
var soundErrorBox = document.createElement('div');
soundErrorBox.className = "tooltip top";
soundErrorBox.id = "sound-error-box";
soundErrorBox.innerHTML = '<div class="tooltip-inner">Error when loading the sound, click <a id="sound-error-link" target="_blank">here</a> and try to fix the problem. <button id="sound-error-button">Done</button></div>';

function tryagain() {
    hideSoundErrorBox();
    audio.load();
}

function hideSoundErrorBox() {
    soundErrorBox.style.display = "none";
}

function displaySoundErrorBox(url) {
    var container = document.querySelector("[data-test='challenge-header']").parentNode;
    container.insertBefore(soundErrorBox, container.firstChild);
    document.getElementById("sound-error-link").href = url;
    soundErrorBox.style.display = "";
    document.getElementById("sound-error-button").onclick = tryagain;
}

/* Audio functions */

var audio;
var prevAudio;
var waiting = false;
var counter = 0;

function playSound(url) {
	var a = new Audio(url);
    a.play();
	/*
    counter = counter + 1;
    if(prevAudio){ prevAudio.destruct(); }
    prevAudio = audio;
    waiting = (prevAudio && prevAudio.playState == 1);
    // race condition here...
    audio = soundManager.createSound({
        id: "sound-" + counter,
        url: url,
        autoLoad: true,
        onload: function() {
            if(audio.readyState == 2){
                displaySoundErrorBox(audio.url);
            } else if(!waiting){
                audio.play();
            }
        },
        onfinish: function () {
            if(waiting) {
                waiting = false;
                audio.play();
            }
        }
    });
    */
}

var sentenceGlobal = null;
var lastSaidSlow = false;

function googleTTSLang(targetLang) {
    if (targetLang == "dn") { return "nl"; }
    if (targetLang == "zs") { return "zh"; }
    return targetLang;
}

function say(sentence) {
    console.debug("Reverse Tree Enhancer: saying '" + sentence + "'");
    sentenceGlobal = sentence;
    playSound("http://translate.google.com/translate_tts?tl=" + googleTTSLang(targetLang) + "&q=" + encodeURIComponent(sentence) + "&client=tw-ob");
    lastSaidSlow = false;
}

function sayslow() {
    var sentence = sentenceGlobal;
    console.debug("Reverse Tree Enhancer: saying slowly '" + sentence + "'");
    playSound("http://translate.google.com/translate_tts?tl=" + googleTTSLang(targetLang) + "&q=" + encodeURIComponent(sentence) + "&client=tw-ob&ttsspeed=0");
    lastSaidSlow = true;
}

function keyUpHandler(e) {
    if (e.shiftKey && e.keyCode == 32 && audio) {
        if (e.altKey) {
            if (lastSaidSlow) {
                audio.stop().play();
            } else {
                sayslow();
            }
        } else {
            if (lastSaidSlow) {
                say(sentenceGlobal);
            } else {
                audio.stop().play();
            }
        }
    }
}

document.addEventListener('keyup', keyUpHandler, false);

function sayCell(cell) {
    var t = $(cell).clone();
    t.find('table').remove();
    say(t.text());
}


/* Functions acting on the various types of exercices */


/* Translation from target language (eg. Polish) */
function challengeTranslateTarget(){
    // var cell = challenge.getElementsByClassName("text-to-translate")[0];
    var cell = document.querySelector("[data-test='challenge-translate-prompt']");
    sayCell(cell);
    cell.className = "text-to-translate ttt-hide";
	cell.onclick = function(){cell.className = "text-to-translate ttt-not-hide"}
	/*
    if(grade.children.length === 0){
        sayCell(cell);
        cell.className = "text-to-translate ttt-hide";
        cell.onclick = function(){cell.className = "text-to-translate ttt-not-hide"}
    } else {
       cell.className = "text-to-translate";
       cell.onclick = null;
    }
    */
}

/* Translation from source language (eg. English) */
function challengeTranslateSource(){
	if(document.getElementsByTagName("h2").length > 0) {
		var betterAnswer = document.getElementsByTagName("h2")[0].getElementsByTagName("span");
		if(betterAnswer.length === 0){
    	    say(document.getElementById("submitted-text").textContent);
		} else {
        	say(betterAnswer[0].textContent);
    	}
    }
	/*
    if(grade.children.length > 0){
        var betterAnswer = grade.getElementsByTagName("h1")[0].getElementsByTagName("span");
        // Hack for making timed practice work
        var isTimedPractice = (grade.getElementsByClassName("icon-clock-medium").length !== 0);
        var blame = document.getElementById("blame-1")
        var isTypo = blame && blame.offsetParent !== null
        if(isTimedPractice && !isTypo){
            betterAnswer = [];
        }
        
        if(betterAnswer.length === 0){
            say(document.getElementById("submitted-text").textContent);
        } else {
            say(betterAnswer[0].textContent);
        }
    }
    */
}

/* Multiple-choice translation question */ /* TODO */
function challengeJudge(){
    var textCell = challenge.getElementsByClassName("col-left")[0].getElementsByTagName("bdi")[0];
    var ul = challenge.getElementsByTagName("ul")[0];
    if(document.getElementsByTagName("h2").length === 0) {
        textCell.style.color = hColor;
        textCell.style.backgroundColor = hColor;
        textCell.style.display = "block";
        
        say(textCell.textContent);
    } else {
        textCell.style.color = "";
        textCell.style.backgroundColor = "";
        ul.className += " nothiding";
    }
}

var quotMark = /(["“”「」])/;

/* Select the correct image */
function challengeSelect(){
    var hone = challenge.getElementsByTagName("h1")[0];
    var ul = challenge.getElementsByTagName("ul")[0];
    var span;
    if(document.getElementsByTagName("h2").length === 0) {
        var sp = hone.textContent.split(quotMark);
        hone.innerHTML = sp[0] + sp[1] + "<span>" + sp[2] + "</span>" + sp[3] + sp[4];
        span = hone.getElementsByTagName("span")[0];
        say(span.textContent);
        span.style.color = hColor;
        span.style.backgroundColor = hColor;
    } else {
        span = hone.getElementsByTagName("span")[0];
        span.style.color = "";
        span.style.backgroundColor = "";
        ul.className += " nothiding";
    }
}

/* Type the word corresponding to the images */
function challengeName(){
    var lis = challenge.getElementsByTagName("li");
    var hone = challenge.getElementsByTagName("h1")[0];
    var span, i;
    if(document.getElementsByTagName("h2").length === 0) {
        var sp = hone.textContent.split(quotMark);
        hone.innerHTML = sp[0] + sp[1] + "<span>" + sp[2] + "</span>" + sp[3] + sp[4];
        span = hone.getElementsByTagName("span")[0];
        say(span.textContent);
        span.style.color = hColor;
        span.style.backgroundColor = hColor;
        for(i=0; i < lis.length; i++){
            lis[i].style.backgroundColor = hColor;
            lis[i].dataset.oldImage = lis[i].style.backgroundImage;
            lis[i].style.backgroundImage = "";
        }
    } else {
        span = hone.getElementsByTagName("span")[0];
        span.style.color = "";
        span.style.backgroundColor = "";

        for(i=0; i < lis.length; i++){
            lis[i].style.backgroundImage = lis[i].dataset.oldImage;
        }
    }
}

/* Multiple-choice question where we have to choose a word in the source language. Those are useless exercices, but we can’t get rid of them. */ /* TODO */
function challengeForm(){
    if(document.getElementsByTagName("h2").length > 0) {
        say(document.getElementsByTagName("h2")[0].children[1].textContent);
    }
}

/* Function dealing with the button on the home page */

// Due to the removal of duo.user, finding what language is being learned is not immediate. This function gives a good guess
function getLearningLanguage() {
	for (var i = 0; i < localStorage.length; i++) {
		var keySplit = localStorage.key(i).split(".");
		if(keySplit.length === 3 && keySplit[1] == "languageTokens" && keySplit[2] != duo.uiLanguage) {
			return keySplit[2];
		}
	}
	var skillLink = document.querySelector("[data-test='red skill-tree-link']");
	if(skillLink === null) {
		skillLink = document.querySelector("[data-test='green skill-tree-link']");
	}
	if(skillLink === null) {
		skillLink = document.querySelector("[data-test='blue skill-tree-link']");
	}
	if(skillLink === null) {
		return null;
	}
	var linkParts = skillLink.href.split("/");
	return linkParts[linkParts.length - 2];
}

function isReverseTree() {
    var reverseTrees = JSON.parse(localStorage.getItem("reverse_trees"));
    if(reverseTrees === null) {
        return false;
    }
    var item = duo.uiLanguage + "-" + getLearningLanguage();
    return !!(reverseTrees[item]);
}

function toggleLang() {
    var reverseTrees = JSON.parse(localStorage.getItem("reverse_trees"));
    if(reverseTrees === null) { reverseTrees = {}; }
    var item = duo.uiLanguage + "-" + getLearningLanguage();
    reverseTrees[item] = !reverseTrees[item];
    localStorage.setItem("reverse_trees", JSON.stringify(reverseTrees));
    updateButton();
}

function updateButton() {
    var button = document.getElementById("reverse-tree-enhancer-button");
    if(button === null){ return; }
    if(isReverseTree()) {
        button.textContent = "This is a reverse tree!";
        button.className = "btn btn-standard right btn-store selected";
    } else {
        button.textContent = "Is this a reverse tree?";
        button.className = "btn btn-standard right btn-store";
    } 
}

/* pulling class equivalents from new website */

function getClass() {
	if(window.location.pathname == "/") {
		return "home";
	}
	if(document.querySelector("[data-test='player-end-carousel']") !== null) {
		return "slide-session-end";
	}
	if(document.querySelector("[data-test='challenge challenge-translate']") !== null) {
		return "translate";
	}
	if(document.querySelector("[data-test='challenge challenge-judge']") !== null) {
		return "judge";
	}
	if(document.querySelector("[data-test='challenge challenge-select']") !== null) {
		return "select";
	}
	if(document.querySelector("[data-test='challenge challenge-name']") !== null) {
		return "name";
	}
	if(document.querySelector("[data-test='challenge challenge-form']") !== null) {
		return "form";
	}
	return null;
}



/* Function dispatching the changes in the page to the other functions */

var oldclass = "";
var targetLang;
var challenge;

function onChange() {
	var newclass = getClass();
    
    if(/home/.test(newclass) && !document.getElementById("reverse-tree-enhancer-button")){
		var tree = document.querySelector("[data-test='skill-tree']");
        var button = document.createElement("button");
        button.id = "reverse-tree-enhancer-button";
        button.onclick = toggleLang;
        tree.insertBefore(button, tree.firstChild);
        updateButton();
    }
    
    if (/slide-session-end/.test(newclass)) {
        // End screen ("you beat the clock...").
        // Destroy the reference to the audio object
        // so that subsequent <S-Space> keypresses
        // don't cause the audio to repeat in, e.g., the tree or discussions.
        audio = null;
    }

    if(newclass != oldclass){
        oldclass = newclass;
        console.debug("New class: " + newclass);

        hideSoundErrorBox();
        
        if(!isReverseTree()) {
            targetLang = "";
            removeCSSHiding();
            return;
        }
        targetLang = duo.uiLanguage;
        if(!document.getElementById("timer")) { addCSSHiding(); } else { removeCSSHiding(); }
        
        if(/translate/.test(newclass)){
            challenge = document.querySelector("[data-test='challenge challenge-translate']");
            if (challenge.getElementsByTagName("textarea")[0].getAttribute("lang") == targetLang){
                challengeTranslateSource();
            } else {
                challengeTranslateTarget();
            }
        }
        if(/judge/.test(newclass)){
        	challenge = document.querySelector("[data-test='challenge challenge-judge']");
            challengeJudge();
        }
        if(/select/.test(newclass)){
        	challenge = document.querySelector("[data-test='challenge challenge-select']");
            challengeSelect();
        }
        if(/name/.test(newclass)){
        	challenge = document.querySelector("[data-test='challenge challenge-name']");
            challengeName();
        }
        if(/form/.test(newclass)){
        	challenge = document.querySelector("[data-test='challenge challenge-form']");
            challengeForm();
        }
    }
}

new MutationObserver(onChange).observe(document.body, {attributes: true, childList: true, subtree: true});

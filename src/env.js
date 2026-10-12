/* read once at boot, shared by every module */
export var $ = function(id){ return document.getElementById(id); };
export var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export var canHover = window.matchMedia('(hover: hover)').matches;

import { loadImageAsync, drawImageAndResizeVertical } from './modules/utils.js';
import { load1bppFontAsync, loadFontTable } from './modules/font.js'

const DIALOG_WINDOW_WIDTH = 160;
const DIALOG_WINDOW_HEIGHT = 40;
const PORTRAIT_WIDTH = 32;
const PORTRAIT_HEIGHT = 32;

const dialog_string = "<SFF>Ah!<D3>A shooting star!<*04>";

const element_canvas = document.getElementById('output');
const canvas_ctx = element_canvas.getContext('2d');

// Preload windows
const next_page_images = [
	loadImageAsync("resources/window/next-page.png"),

	loadImageAsync("resources/window/error-top-next-page.png"),
	loadImageAsync("resources/window/error-bottom-next-page.png"),
	loadImageAsync("resources/window/error-both-next-page.png"),
];

const last_page_images = [
	loadImageAsync("resources/window/last-page.png"),

	loadImageAsync("resources/window/error-top-last-page.png"),
	loadImageAsync("resources/window/error-bottom-last-page.png"),
	loadImageAsync("resources/window/error-both-last-page.png"),
];

// Preload fonts and apply necessary transparency 
const font_default = load1bppFontAsync("resources/fonts/Font.png");
const font_narrow = load1bppFontAsync("resources/fonts/NarrowFont.png");
const font_default_bold = load1bppFontAsync("resources/fonts/BoldFont.png");
const font_robotic = load1bppFontAsync("resources/fonts/RoboticFont.png");
const font_robotic_bold = load1bppFontAsync("resources/fonts/BoldRoboticFont.png");

// Font Table to map characters to indices
const font_file = loadFontTable("resources/fonts/VWF.lst");
font_file.then(fm => console.log(fm));

element_canvas.height = 0;
element_canvas.width = 0;
//Promise.all(next_page_images).then(images => images.forEach( img => { drawImageAndResizeVertical(element_canvas, img); } ))
//Promise.all(last_page_images).then(images => images.forEach( img => { drawImageAndResizeVertical(element_canvas, img); } ))
font_default.then(images => images.forEach(([width, img]) => { drawImageAndResizeVertical(element_canvas, img); }));
import * as constants from './modules/const.js'
import { assert, loadImageAsync, drawImageAndResizeVertical } from './modules/utils.js';
import { load1bppFontAsync, loadFontTableAsync } from './modules/font.js'

const element_canvas = document.getElementById('output');
const canvas_ctx = element_canvas.getContext('2d');

// Preload and preprocess images
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

// TODO: Load portraits

const font_default = load1bppFontAsync("resources/fonts/Font.png");
//const font_narrow = load1bppFontAsync("resources/fonts/NarrowFont.png");
const font_default_bold = load1bppFontAsync("resources/fonts/BoldFont.png");
const font_robotic = load1bppFontAsync("resources/fonts/RoboticFont.png");
const font_robotic_bold = load1bppFontAsync("resources/fonts/BoldRoboticFont.png");

const font_map = loadFontTableAsync("resources/fonts/VWF.lst");

element_canvas.height = 0;
element_canvas.width = 0;

const dialog_string = "<SFF>Ah!<D3><D3>A shooting star!<*04>";

// TODO: Strip out control codes we won't use (end codes and speed codes)
const modified_string = "Ah\n\nA shooting star!";

// TODO: Split text to each text box (effectively every 2nd new line denotes a new box)
const text_boxes = ["Ah", "A shooting star!"];

// TODO: For each text box, determine the necessary fonts
const necessary_fonts = [[font_default], [font_default, font_default_bold]];

// TODO: For each text box, determine the active portrait
const necessary_portraits = [null, null];

// TODO: Determine what text box this needs to be in (if it's last, if the text is too long, etc...)
const text_windows = [next_page_images[0], last_page_images[0]];

// TODO: For each text box, wait for their dependencies and start drawing them
const drawBox = async (dependencies) =>
{
	let [font_map, text, text_window, ...necessary_fonts] = await Promise.all(dependencies);
	return text_window;
};

let final_images = [];

text_boxes.forEach((text, idx) => 
{
	let dependencies = [font_map];
	dependencies.push(text);
	dependencies.push(text_windows[idx]);
	dependencies.push(...necessary_fonts[idx]);
	final_images.push(drawBox(dependencies));
});

// Wait for all boxes to be prepared and then copy them into the main canvas them in order
Promise.all(final_images).then((images) => { images.forEach( image => { drawImageAndResizeVertical(element_canvas, image); }); });

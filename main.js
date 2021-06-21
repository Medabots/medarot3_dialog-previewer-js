import { assert, drawImageAndResizeVertical } from './modules/utils.js';

// Should be possible to use this for any game as long as 'getDependencies' and 'drawBox' are defined
import { getDependencies, drawBox } from './modules/medarot3.js'

const dialog_string = "<@LL,00,00><SFF>Ah!<D3><D3><@RR,00,01>A shooting star!<*04>";

const element_canvas = document.getElementById('output');
const canvas_ctx = element_canvas.getContext('2d');
element_canvas.height = 0;
element_canvas.width = 0;

let final_images = [];
for(let dependency of getDependencies(dialog_string))
{
	final_images.push(drawBox(dependency));
};

// Wait for all boxes to be prepared and then copy them into the main canvas them in order
Promise.all(final_images).then((images) => { images.forEach( image => { drawImageAndResizeVertical(element_canvas, image); }); });
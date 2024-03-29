// Should be possible to use this for any game as long as 'initialize', 'getDependencies' and 'drawBox' are defined
import { initialize, autoLinebreak, getDependencies, drawBox } from './modules/medarot3.js'
import { assert, drawImageAndResizeVertical } from './modules/utils.js';



const default_dialog_string = "<@RL,0A,01>Include the string to preview by appending ?t=TEXT to the URL.";
const uri_args = window.location.search.substring(1);

//const dialog_string = "<SFF>Ah!<D3>What's that?<D3><D3><@LL,00,00>A shooting star!<*04>";
//const dialog_string = "<@RL,0A,01>Sorry!<D3>I can't do it in this version!<*03>";
//const dialog_string = "Huh? A kid?<CF>I thought it was a shooting<D3>star.<CF>Maybe I can ask them how to<D3>get home.<CF>...but how could they know?<*03>";
//const dialog_string = "Huh? A kid?<CF><D3>I thought it was a shooting<D3>star.<D3>Maybe I can ask them how to<D3>get home.<D3>...but how could they know?<*03>";
//const dialog_string = "Inserted the <f02><&BUF06><f00> medal.";
//const dialog_string = "<@LL,00,04>It's a vending machine that has juice. <CF>I'm not thirsty right now."
//const dialog_string = "<@LL,00,04>It's a vending machine that sells ice cream.<CF><@LL,00,01>Pudding ice cream...!<CF><@LL,00,03>Nah..."
const dialog_string = uri_args && uri_args.includes('t=') ? decodeURIComponent(uri_args.split('t=')[1]) : default_dialog_string;

const element_canvas = document.getElementById('output');
const canvas_ctx = element_canvas.getContext('2d');
element_canvas.height = 0;
element_canvas.width = 0;


let final_images = [];
initialize().then( () => 
{
	autoLinebreak(dialog_string).then( (formatted_string) =>
	{
		for(let dependency of getDependencies(formatted_string))
		{
			final_images.push(drawBox(dependency));
		}
		// Wait for all boxes to be prepared and then copy them into the main canvas them in order
		Promise.all(final_images).then((images) => { images.forEach( image => { drawImageAndResizeVertical(element_canvas, image); }); });	
	});
});

// General purpose utilities, not specific to the project

const assert = (condition, message = "") =>
{
	if (!condition)
	{
		throw new Error(message || "Assertion failed");
	}
};

const loadImageAsync = (url) => 
(
	new Promise(resolve => 
	{
		const image = new Image();
		image.onload = () => { resolve(image); };
		image.src = url;
	})
);

// Expects a perfect fit canvas (height = 0 if nothing is in it yet)
// This wouldn't be necessary if canvas provided a more convenient way to determine if something was already drawn
const drawImageAndResizeVertical = (element_canvas, img) =>
{
	let context = element_canvas.getContext('2d');
	let current_width = element_canvas.width;
	let current_height = element_canvas.height;
	let is_empty = current_height == 0 || current_width == 0;

	let data = is_empty ? null : context.getImageData(0, 0, current_width, current_height);

	element_canvas.height += img.height;
	element_canvas.width = current_width < img.width ? img.width : current_width;
	if(data) { context.putImageData(data, 0, 0); }

	context.drawImage(img, 0, current_height);
};

const getTextFileAsync = (file_path) =>
(
	new Promise(resolve =>
	{
		let request = new XMLHttpRequest();
		request.responseType = "text";
		request.open("GET", file_path, true);
		request.onreadystatechange = function()
		{
			if(request.readyState === XMLHttpRequest.DONE)
			{
				let status = request.status;
				if (status === 0 || (status >= 200 && status < 400))
				{
					resolve(request.responseText);
				}
				else
				{
					alert("Failed to load " + file_path + "\nError Code: " + status);
					resolve(null);
		  		}
			}
		};
		request.send();
	})
);

export { assert, loadImageAsync, drawImageAndResizeVertical, getTextFileAsync }

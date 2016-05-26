var glowFb = null;
var glowTex = null;
var glowSwapTex = null;

function draw(msTime)
{
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	//Update view
	mvp.setView(cam.getLookAt());
	gl.uniform3fv(main_shader.uniform.eye, cam.getEye().asArray());

	var glowPiece = hoverSpace ? game.pieceAt(hoverSpace) : null;

	if(hoverSpace && !glowPiece)
	{
		//Draw spaces behind glow
		drawBoard(function(ix, iy) {
			return ix != hoverSpace[0] || iy != hoverSpace[1];
		});

		//Draw glow for highlighted space
		drawGlow(function() {
			drawBoard(function(ix, iy) {
				return ix == hoverSpace[0] && iy == hoverSpace[1];
			}, blank_shader);
		});

		//Draw spaces in front of glow
		drawBoard(function(ix, iy) {
			return ix == hoverSpace[0] && iy == hoverSpace[1];
		});
	}
	else
	{
		//Draw entire board
		drawBoard();
	}

	if(glowPiece)
	{
		//Compute piece distances from camera
		for(var i = 0; i < game.pieces.length; i++)
		{
			game.pieces[i].viewDistance = game.pieces[i].getWorldPosition().sub(cam.getEye()).len();
		}

		//Draw pieces behind glow
		drawPieces(function(x){ return x.viewDistance > glowPiece.viewDistance; });

		//Draw glow for highlighted piece
		drawGlow(function() {
			drawPiece(glowPiece, blank_shader);
		});

		//Draw pieces in front of glow
		drawPieces(function(x){ return x.viewDistance <= glowPiece.viewDistance; });
	}
	else
	{
		//Draw all pieces
		drawPieces();
	}

	//Progress game time
	update(msTime);

	window.requestAnimationFrame(draw);
}

function drawPieces(filter)
{
	if(!filter) filter = function() { return true; };

	//Draw white chess pieces
	gl.bindTexture(gl.TEXTURE_2D, tex_white_marble);
	for(var i = 0; i < game.pieces.length; i++)
	{
		if(game.pieces[i].owner == "white" && filter(game.pieces[i]))
		{
			drawPiece(game.pieces[i]);
		}
	}

	//Draw black chess pieces
	gl.bindTexture(gl.TEXTURE_2D, tex_black_marble);
	for(var i = 0; i < game.pieces.length; i++)
	{
		if(game.pieces[i].owner == "black" && filter(game.pieces[i]))
		{
			drawPiece(game.pieces[i]);
		}
	}
}

function createFramebufferTex(framebuffer)
{
	var tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, framebuffer.width, framebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	return tex;
}

function drawGlow(drawBlanks)
{
	//Initialize and bind framebuffer
	if(glowFb == null)
	{
		//Initialize the framebuffer
		glowFb = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, glowFb);
		//Fixed width/height is sufficient for a glow effect
		glowFb.width = 512;
		glowFb.height = 512;
		//Initialize textures to store frame colors
		glowTex = createFramebufferTex(glowFb);
		glowSwapTex = createFramebufferTex(glowFb);
	}
	else
	{
		//Bind the previously created framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, glowFb);
	}
	//Draw to framebuffer
	gl.viewport(0, 0, glowFb.width, glowFb.height);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glowTex, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	//Draw as flat white
	gl.disable(gl.DEPTH_TEST);
	gl.useProgram(blank_shader.program);
	//Render desired shapes
	drawBlanks();
	//Swap framebuffer textures
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glowSwapTex, 0);
	gl.bindTexture(gl.TEXTURE_2D, glowTex);
	//Blur X
	gl.useProgram(blur_shader.program);
	gl.uniform3fv(blur_shader.uniform.color, new vec3(0.412, 0.98, 0.427).scaleIn(2).asArray());
	gl.uniform1i(blur_shader.uniform.blurDirection, 0);
	gl.uniform2fv(blur_shader.uniform.texSize, new Float32Array([glowFb.width, glowFb.height]));
	drawScreenOverlay();
	//Unbind framebuffer
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, canvas.width, canvas.height);
	//Blur Y and blend onto screen
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	gl.uniform1i(blur_shader.uniform.blurDirection, 1);
	gl.bindTexture(gl.TEXTURE_2D, glowSwapTex);
	drawScreenOverlay();
	//Restore normal drawing mode
	gl.disable(gl.BLEND);
	gl.enable(gl.DEPTH_TEST);
	gl.useProgram(main_shader.program);
}

//Draws a texture over the entire screen
function drawScreenOverlay()
{
	if(!drawScreenOverlay.buf)
	{
		//Initialize buffer data for corners
		drawScreenOverlay.buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, drawScreenOverlay.buf);
		gl.bufferData(gl.ARRAY_BUFFER,
			new Float32Array([
				-1, -1,
				-1, 1,
				1, -1,
				1, 1 ]),
			gl.STATIC_DRAW);
	}

	//Bind the data and draw two triangles
	gl.bindBuffer(gl.ARRAY_BUFFER, drawScreenOverlay.buf);
	gl.vertexAttribPointer(screen_shader.attrib.pos, 2, gl.FLOAT, false, 0, 0);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function drawBoardSegment(ix, iy, shader)
{
	if(!shader) shader = main_shader;

	var pos = game.getSpaceWorldPosition([ix, iy]);
	//Use texture offsets for variation
	if(shader.uniform.uvOffset)
	{
		gl.uniform2fv(shader.uniform.uvOffset, [(ix % 4) * 0.25, (iy % 4) * 0.25]);
	}
	//Translate and draw segment
	mvp.pushModel();
	mvp.multModel(mat4.translate(pos));
	drawModel(mdl_board, shader);
	mvp.popModel();
}

function drawBoard(filter, shader)
{
	if(!filter) filter = function() { return true; };
	if(!shader) shader = main_shader;

	//Draw white sections
	gl.bindTexture(gl.TEXTURE_2D, tex_white_marble);
	for(var ix = 0; ix < BOARD_ROW_COUNT; ix++)
	{
		for(var iy = ix % 2; iy < BOARD_ROW_COUNT; iy += 2)
		{
			if(filter(ix, iy)) drawBoardSegment(ix, iy, shader);
		}
	}

	//Draw black sections
	gl.bindTexture(gl.TEXTURE_2D, tex_black_marble);
	for(var ix = 0; ix < BOARD_ROW_COUNT; ix++)
	{
		for(var iy = (ix + 1) % 2; iy < BOARD_ROW_COUNT; iy += 2)
		{
			if(filter(ix, iy)) drawBoardSegment(ix, iy, shader);
		}
	}

	//Reset texture offset
	if(shader.uniform.uvOffset)
	{
		gl.uniform2fv(shader.uniform.uvOffset, [0, 0]);
	}
}

//Draw a specific chess piece
function drawPiece(piece, shader)
{
	//Translate to final position
	mvp.pushModel();
	mvp.multModel(mat4.translate(piece.getWorldPosition()));

	//Black pieces need to be flipped around
	if(piece.owner == "black")
	{
		mvp.multModel(mat4.rotate(new vec3(0, 1, 0), Math.PI));
	}

	//Draw the piece model for this type
	drawModel(piece_models[piece.type], shader);

	//Restore model matrix
	mvp.popModel();
}

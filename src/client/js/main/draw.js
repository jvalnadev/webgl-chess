function draw(msTime)
{
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	mvp.setView(cam.getLookAt());
	gl.uniform3fv(main_shader.uniform.eye, cam.getEye());
	gl.uniformMatrix4fv(main_shader.uniform.mvp, false, mvp.getMvp());

	drawModel(mdl_monkey);
	//drawModel(mdl_cube);

	update(msTime);

	window.requestAnimationFrame(draw);
}
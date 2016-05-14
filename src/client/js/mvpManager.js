function MvpManager()
{
	this._mvp = mat4.create();
	this._model = mat4.create();
	this._view = mat4.create();
	this._projection = mat4.create();
	this._stale = true;

	this.setModel = function(mat)
	{
		mat4.copy(this._model, mat);
		this._stale = true;
	};

	this.getModel = function()
	{
		return this._model;
	}

	this.setView = function(mat)
	{
		mat4.copy(this._view, mat);
		this._stale = true;
	};

	this.getView = function()
	{
		return this._view;
	}

	this.setProjection = function(mat)
	{
		mat4.copy(this._projection, mat);
		this._stale = true;
	};

	this.getProjection = function()
	{
		return this._projection;
	}

	this.getMvp = function()
	{
		if(this._stale)
		{
			mat4.multiply(this._mvp, this._projection, this._view);
			mat4.multiply(this._mvp, this._mvp, this._model);
			this._stale = false;
		}
		return this._mvp;
	};
}
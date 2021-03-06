var SimpleQueue = function(worker, callback, done, concurrent){
	this._concurrent = concurrent || 20;
	this._worker = worker;
	this._callback = callback;
	this._done = done;
	this._queue = [];
	this._stack = {}; //stores elements that are finished
	this._working = 0;
	this._lastStarted = 0;
	this._finished = 0;
	this._paused = false;
};

SimpleQueue.prototype.push = function(props){
	this._queue.push(props);
	this._scan();
};

SimpleQueue.prototype.abort = function(){
	//clears the queue (can't stop running processes)
	this._queue.splice(0);
	this._paused = true; //cb won't be called any more
};

SimpleQueue.prototype.pause = function(){
	this._paused = true;
};

SimpleQueue.prototype.resume = function(){
	this._paused = false;
	this._scan();
	this._checkStack();
}

SimpleQueue.prototype._checkStack = function(){
	while(this._stack[this._finished]){
	    this._callback.apply(this, this._stack[this._finished]);
	    delete this._stack[this._finished];
	    this._finished += 1;
	}
	if(this._working === 0 && this._queue.length === 0 && this._done){
	    this._done();
	}
};

SimpleQueue.prototype._scan = function(){
	if( this._working === this._concurrent || 
		this._queue.length === 0 ||
		this._paused) return;

	var element = this._queue.shift(),
		index = this._lastStarted++,
		that = this;
	
	this._working++;

	this._worker(element, function(err, result){
		that._working--;
		if(!that._paused && index === that._finished){
			that._callback(err, result, element);
			that._finished += 1;
			that._checkStack();
		}
		else that._stack[index] = [err, result, element];
		
		that._scan();
	});
};

module.exports = SimpleQueue;
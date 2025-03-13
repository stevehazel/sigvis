let __state = {

};

const State = () => {
	return __state;
}

const setState = (key, val) => {
	__state[key] = val;
}

export {
	State,
	setState,
};
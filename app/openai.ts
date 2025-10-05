import OpenAI from "openai";

let _openai: OpenAI | null = null;

export const openai = () => {
	if (!_openai) {
		_openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		});
	}
	return _openai;
};

"use strict";

function validateQuestionBank(bank) {
  const nonempty = value => typeof value === "string" && value.trim().length > 0;
  const docPath = value => typeof value === "string" && /^\/terraform\/[a-zA-Z0-9/_#.?=-]*$/.test(value);
  if (!bank || bank.version !== 1 || !Array.isArray(bank.topics) || bank.topics.length !== 8 ||
    !Array.isArray(bank.questions) || !bank.questions.length) {
    throw new Error("Question bank must have version 1, eight topics, and a nonempty questions array.");
  }
  const topics = new Map();
  const objectives = new Set();
  for (const topic of bank.topics) {
    if (!topic || !nonempty(topic.id) || !/^[a-z][a-z0-9-]*$/.test(topic.id) || topics.has(topic.id) ||
      !nonempty(topic.objective) || !/^[1-8]$/.test(topic.objective) || objectives.has(topic.objective) ||
      !nonempty(topic.name) || !nonempty(topic.description) || !docPath(topic.source)) {
      throw new Error("Question bank contains an invalid or duplicate topic.");
    }
    topics.set(topic.id, topic);
    objectives.add(topic.objective);
  }
  const objectiveLetters = ["abc", "abcd", "abcdefg", "abcdefgh", "abcd", "abcd", "abc", "abcd"];
  const ids = new Set();
  const prompts = new Set();
  for (const question of bank.questions) {
    const topic = topics.get(question?.topic);
    if (!question || !nonempty(question.id) || !/^[a-z][a-z0-9-]*$/.test(question.id) || ids.has(question.id) || !topic ||
      !nonempty(question.prompt) || prompts.has(question.prompt.trim().toLowerCase()) ||
      !new RegExp(`^${topic.objective}[${objectiveLetters[Number(topic.objective) - 1]}]$`).test(question.objective) ||
      !Array.isArray(question.options) || question.options.length < 2 || !question.options.every(nonempty) ||
      new Set(question.options).size !== question.options.length ||
      !Array.isArray(question.answers) || !question.answers.length ||
      question.answers.length >= question.options.length || new Set(question.answers).size !== question.answers.length ||
      !question.answers.every(index => Number.isInteger(index) && index >= 0 && index < question.options.length) ||
      !nonempty(question.explanation) || !docPath(question.source) ||
      (question.code !== undefined && !nonempty(question.code))) {
      throw new Error(`Invalid or duplicate question: ${question?.id || "(missing id)"}.`);
    }
    ids.add(question.id);
    prompts.add(question.prompt.trim().toLowerCase());
  }
  for (const topic of topics.values()) {
    if (!bank.questions.some(question => question.topic === topic.id)) {
      throw new Error(`Topic ${topic.id} has no questions.`);
    }
  }
  return bank;
}

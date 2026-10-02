import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, nextOptionIndex } from "../../client/src/components/ui/select";
import FormResponse from "../../client/src/components/FormResponse";
import AssessmentReview from "../../client/src/components/AssessmentReview";
import type { FormQuestion } from "../../shared/schema";

const question: FormQuestion[] = [
  { id: "essay", type: "paragraph", label: "Explain your reasoning", options: [], required: true },
  { id: "choice", type: "multiple_choice", label: "Choose one", options: ["Alpha", "Beta"], required: true },
  { id: "true", type: "true_false", label: "Is it true?", options: [], required: false },
];

test("answer fields and choices have programmatic labels, groups, and room for writing", () => {
  const html = renderToStaticMarkup(React.createElement(FormResponse, {
    questions: question, answers: { essay: "Several paragraphs\nSecond line", choice: "Beta" },
    onChange: () => {},
  }));
  assert.match(html, /id="question-essay"/);
  assert.match(html, /aria-labelledby="question-essay"/);
  assert.match(html, /aria-required="true"/);
  assert.match(html, /Several paragraphs\nSecond line/);
  assert.match(html, /min-h-\[10rem\]/);
  assert.match(html, /role="radiogroup" aria-labelledby="question-choice"/);
  assert.match(html, /role="radiogroup" aria-labelledby="question-true"/);
  assert.match(html, /min-h-11/);
});

test("custom select exposes its selected label and combobox state", () => {
  const html = renderToStaticMarkup(React.createElement(Select, {
    value: "beta", onValueChange: () => {},
    children: [
      React.createElement(SelectTrigger, { key: "trigger", id: "test-select", children: React.createElement(SelectValue, { placeholder: "Choose" }) }),
      React.createElement(SelectContent, { key: "content", children: [
        React.createElement(SelectItem, { key: "a", value: "alpha", children: "Alpha" }),
        React.createElement(SelectItem, { key: "b", value: "beta", children: "Beta" }),
      ] }),
    ],
  }));
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Beta/);
  assert.equal(nextOptionIndex(["alpha", "beta"], "", "ArrowDown"), 0);
  assert.equal(nextOptionIndex(["alpha", "beta"], "", "ArrowUp"), 1);
  assert.equal(nextOptionIndex(["alpha", "beta"], "beta", "ArrowDown"), 0);
  assert.equal(nextOptionIndex(["alpha", "beta"], "beta", "Home"), 0);
});

test("review pairs long saved responses without making them look like input fields", () => {
  const html = renderToStaticMarkup(React.createElement(AssessmentReview, {
    submission: {
      status: "graded", questionSnapshot: question,
      formAnswers: { essay: "A long explanation\nWith another paragraph", choice: "Beta" },
    },
    currentQuestions: [],
  }));
  assert.match(html, /assessment-review-card/);
  assert.match(html, /assessment-review-grid/);
  assert.match(html, /whitespace-pre-wrap/);
  assert.match(html, /A long explanation\nWith another paragraph/);
  assert.doesNotMatch(html, /<textarea/);
});
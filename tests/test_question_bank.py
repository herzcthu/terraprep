import hashlib
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BANK = json.loads((ROOT / "questions.json").read_text())
OBJECTIVES = {
    f"{number}{letter}"
    for number, letters in enumerate(
        ("abc", "abcd", "abcdefg", "abcdefgh", "abcd", "abcd", "abc", "abcd"),
        start=1,
    )
    for letter in letters
}


class QuestionBankTests(unittest.TestCase):
    def test_size_and_coverage(self):
        self.assertEqual(BANK["version"], 1)
        self.assertGreaterEqual(len(BANK["questions"]), 168)
        self.assertEqual(len(BANK["topics"]), 8)
        self.assertEqual({q["objective"] for q in BANK["questions"]}, OBJECTIVES)
        for topic in BANK["topics"]:
            self.assertGreaterEqual(
                sum(q["topic"] == topic["id"] for q in BANK["questions"]), 12
            )

    def test_unique_questions_and_topics(self):
        for field in ("id", "prompt"):
            values = [q[field].strip().lower() for q in BANK["questions"]]
            self.assertEqual(len(values), len(set(values)))
        self.assertEqual(len({t["id"] for t in BANK["topics"]}), 8)
        self.assertEqual({t["objective"] for t in BANK["topics"]}, set("12345678"))

    def test_question_shapes(self):
        topics = {t["id"]: t for t in BANK["topics"]}
        for question in BANK["questions"]:
            with self.subTest(question=question["id"]):
                self.assertRegex(question["id"], r"^[a-z][a-z0-9-]*$")
                self.assertIn(question["topic"], topics)
                self.assertTrue(
                    question["objective"].startswith(
                        topics[question["topic"]]["objective"]
                    )
                )
                for field in ("prompt", "explanation"):
                    self.assertIsInstance(question[field], str)
                    self.assertTrue(question[field].strip())
                self.assertGreaterEqual(len(question["options"]), 2)
                self.assertEqual(
                    len(question["options"]), len(set(question["options"]))
                )
                self.assertTrue(all(isinstance(o, str) and o.strip() for o in question["options"]))
                self.assertTrue(question["answers"])
                self.assertLess(len(question["answers"]), len(question["options"]))
                self.assertEqual(
                    len(question["answers"]), len(set(question["answers"]))
                )
                for index in question["answers"]:
                    self.assertIs(type(index), int)
                    self.assertGreaterEqual(index, 0)
                    self.assertLess(index, len(question["options"]))
                self.assertRegex(question["source"], r"^/terraform/[a-zA-Z0-9/_#.?=-]*$")
                if "code" in question:
                    self.assertIsInstance(question["code"], str)
                    self.assertTrue(question["code"].strip())

    def test_legacy_storage_compatibility(self):
        legacy = [
            {key: q[key] for key in ("id", "options", "answers")}
            for q in BANK["questions"][:54]
        ]
        digest = hashlib.sha256(json.dumps(legacy, sort_keys=True).encode()).hexdigest()
        self.assertEqual(
            digest,
            "98cd1380145e239e8f4f9150bdd9b5edaf622780e0f25ae4a09933917efa54c7",
            "Existing IDs or option/answer ordering changed; migrate saved progress.",
        )

    def test_existing_120_questions_unchanged(self):
        digest = hashlib.sha256(
            json.dumps(BANK["questions"][:120], sort_keys=True).encode()
        ).hexdigest()
        self.assertEqual(
            digest,
            "538c0c085c3276e4687e9fb172872d9b0809288303f524e8f337f87fe434ef1c",
            "The expansion must preserve every existing question.",
        )

    def test_documentation_review_additions(self):
        expected = {
            *(f"configuration-{number}" for number in range(25, 53)),
            *(f"state-{number}" for number in range(16, 19)),
            "maintenance-13", "maintenance-15", "maintenance-16",
            *(f"hcp-{number}" for number in range(16, 23)),
            "iac-13", "iac-14", "modules-13", "modules-14",
            "workflow-16", "workflow-17", "fundamentals-16",
        }
        additions = {q["id"]: q for q in BANK["questions"][120:]}
        self.assertEqual(len(expected), 48)
        self.assertTrue(expected <= additions.keys())
        for identifier in expected:
            with self.subTest(question=identifier):
                self.assertTrue(additions[identifier]["source"].startswith("/terraform/"))
        self.assertIn("supplementary", additions["configuration-52"]["explanation"])


if __name__ == "__main__":
    unittest.main()

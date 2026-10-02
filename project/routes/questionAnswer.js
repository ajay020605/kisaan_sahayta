import express from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import auth  from "../middleware/auth.js";    

const router = express.Router();
const prisma = new PrismaClient();

// Schemas
const createQuestionSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
 
});

const createAnswerSchema = z.object({
  content: z.string().min(1),
 
});

// Create a new question
router.post("/", auth , async (req, res) => {
  try {
    const { title, content } = createQuestionSchema.parse(req.body);
    const userId = req.user.id;
    console.log("Creating question for userId:", userId);
    const question = await prisma.question.create({
      data: { title, content, userId },
      include: {
        user: { select: { id: true, username: true } },
        answers: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    res.status(201).json(question);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create question" });
  }
});

// Get all questions
router.get("/", auth , async (req, res) => {
  try {
    const questions = await prisma.question.findMany({
      include: {
        user: { select: { id: true, username: true } },
        answers: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});


// Reply to a question (create answer)
router.post("/:questionId/answers", auth , async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    console.log("Replying to questionId:", questionId);
    const { content } = createAnswerSchema.parse(req.body);
    const userId = req.user.id;
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) return res.status(404).json({ error: "Question not found" });

    const answer = await prisma.answer.create({
      data: { content, userId, questionId },
      include: {
        user: { select: { id: true, username: true } },
        question: { select: { id: true, title: true } },
      },
    });

    res.status(201).json(answer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create answer" });
  }
});

// POST /answers/:id/like
router.post("/answers/:id/like", auth, async (req, res) => {
  try {
    const answerId = parseInt(req.params.id);
    const userId = req.user.id;

    // Check if user already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_answerId: { userId, answerId },
      },
    });

    let updatedAnswer;

    if (existingLike) {
      // 👎 Unlike: remove record & decrement count
      await prisma.like.delete({ where: { id: existingLike.id } });
      updatedAnswer = await prisma.answer.update({
        where: { id: answerId },
        data: { likes: { decrement: 1 } },
      });
      return res.json({ message: "Unliked", likes: updatedAnswer.likes });
    } else {
      // 👍 Like: add record & increment count
      await prisma.like.create({
        data: { userId, answerId },
      });
      updatedAnswer = await prisma.answer.update({
        where: { id: answerId },
        data: { likes: { increment: 1 } },
      });
      return res.json({ message: "Liked", likes: updatedAnswer.likes });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});


// Get answers for a question
router.get("/:questionId/answers",auth, async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const answers = await prisma.answer.findMany({
      where: { questionId },
      include: { user: { select: { id: true, username: true } } },
      orderBy: [{ likes: "desc" }, { createdAt: "desc" }],
    });

    res.json(answers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch answers" });
  }
});

// Search questions and answers
router.get("/search", auth ,async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    if (!searchTerm) return res.status(400).json({ error: "Search term required" });

    const questions = await prisma.question.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm, mode: "insensitive" } },
          { content: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      include: {
        user: { select: { id: true, username: true } },
        answers: { include: { user: { select: { id: true, username: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const answers = await prisma.answer.findMany({
      where: { content: { contains: searchTerm, mode: "insensitive" } },
      include: {
        user: { select: { id: true, username: true } },
        question: { include: { user: { select: { id: true, username: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ questions, answers, searchTerm });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search" });
  }
});

export default router;

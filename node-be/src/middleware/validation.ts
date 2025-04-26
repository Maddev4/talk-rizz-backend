import { Request, Response, NextFunction } from "express";

export const validateMessageCreate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { conversationId, senderId, text } = req.body;

  if (!conversationId || !senderId || !text) {
    return res.status(400).json({
      error:
        "Missing required fields: conversationId, senderId, and text are required",
    });
  }

  next();
};

export const validateConversationCreate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { participants } = req.body;

  if (
    !participants ||
    !Array.isArray(participants) ||
    participants.length < 2
  ) {
    return res.status(400).json({
      error: "Participants array with at least 2 users is required",
    });
  }

  const validParticipants = participants.every(
    (p) =>
      p.userId &&
      typeof p.userId === "string" &&
      p.name &&
      typeof p.name === "string"
  );

  if (!validParticipants) {
    return res.status(400).json({
      error: "Each participant must have userId and name",
    });
  }

  next();
};

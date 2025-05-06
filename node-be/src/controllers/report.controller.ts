import { Request, Response } from "express";
import { Report, IReport } from "../models/report.moel";
import { AuthenticatedRequest } from "../middleware/auth";

class ReportController {
  async createReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: userId } = req.user;
      const { roomId } = req.params;
      const { reportType, reportDescription } = req.body;

      const report: IReport = new Report({
        roomId,
        senderId: userId,
        reportType,
        reportDescription,
      });

      await report.save();

      res.status(201).json({
        success: true,
        data: report,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error creating report",
      });
    }
  }

  async getReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: userId } = req.user;
      const { roomId } = req.params;
      const { reportType } = req.query;
      const reports: IReport[] = await Report.find({
        senderId: userId,
        roomId,
        reportType: reportType as "like" | "notVibe" | "report",
      })
        .sort({ timestamp: -1 })
        .populate("roomId", "participants");

      res.status(200).json({
        success: true,
        data: reports,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error fetching reports",
      });
    }
  }
}

export default new ReportController();

import { usersService } from "../services/userService.js";

export class UsersController {
  async notifyNewUser(req, res, next) {
    try {
      const { displayName, email, uid, username, photoURL } = req.body;

      const result = await usersService.sendNewUserNotification({
        displayName,
        email,
        uid,
        username,
        photoURL,
      });

      res.status(200).json({
        success: true,
        message: "New user notification email sent",
        data: result.data,
      });
    } catch (err) {
      next(err);
    }
  }

  async searchUsers(req, res, next) {
    try {
      const { q } = req.query;
      const results = await usersService.searchUsers(q);
      
      res.status(200).json({
        success: true,
        data: results,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const usersController = new UsersController();

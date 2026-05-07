/**
 * Driver controller — location updates and delivery management.
 */
import { Request, Response, NextFunction } from "express";
import DriverLocationEvent from "../models/DriverLocationEvent";
import Order, { OrderStatus } from "../models/Order";
import { getIO } from "../socket";
import { successResponse } from "../utils/response.util";
import { AuthenticationError, NotFoundError } from "../utils/errors";
import type { AuthRequest } from "../types";

/** POST /api/driver/location — Record a location ping and relay to customer */
export const updateLocation = async (
  req: Request, res: Response, next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { orderId, latitude, longitude, heading, speed, accuracy, batteryLevel } = req.body;

    const event = await DriverLocationEvent.create({
      driverId: authReq.user._id,
      orderId,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      heading,
      speed,
      accuracy,
      batteryLevel,
      timestamp: new Date(),
    });

    try {
      const order = await Order.findById(orderId).select("customerId");
      if (order) {
        getIO().to(`user:${order.customerId.toString()}`).emit("driver:locationUpdate", {
          driverId: authReq.user._id.toString(),
          orderId,
          latitude,
          longitude,
          heading,
          speed,
          timestamp: event.timestamp.toISOString(),
        });
      }
    } catch {
      // Non-blocking
    }

    successResponse(res, null, "Location updated");
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/driver/orders/:orderId/status — Driver updates order delivery status */
export const updateDeliveryStatus = async (
  req: Request, res: Response, next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) throw new AuthenticationError();

    const { orderId } = req.params;
    const { status, deliveryProof } = req.body;

    const order = await Order.findOne({ _id: orderId, driverId: authReq.user._id });
    if (!order) throw new NotFoundError("Order not found or not assigned to you");

    const previousStatus = order.status;
    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      actorId: authReq.user._id,
      actorRole: authReq.user.role,
    });

    if (status === OrderStatus.DELIVERED) {
      order.actualDeliveryTime = new Date();
      if (deliveryProof) {
        order.deliveryProof = {
          photoUrl: deliveryProof.photoUrl,
          timestamp: new Date(),
          note: deliveryProof.note,
        };
      }
    }

    await order.save();

    try {
      getIO().to(`user:${order.customerId.toString()}`).emit("orderStatusUpdate", {
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        newStatus: status,
        previousStatus,
        updatedAt: order.updatedAt,
      });
    } catch {
      // Non-blocking
    }

    successResponse(res, { order }, `Order status updated to ${status}`);
  } catch (error) {
    next(error);
  }
};

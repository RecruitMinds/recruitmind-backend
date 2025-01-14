import { clerkClient } from '@clerk/express';
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export const Recruiter = createParamDecorator(
  async (data: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const userId = request.auth.userId;

    // Use the userId to get information about the user
    const user = await clerkClient.users.getUser(userId);
    return user;
  },
);

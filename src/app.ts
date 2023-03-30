import path from "path";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import { inferAsyncReturnType, initTRPC, TRPCError } from "@trpc/server";
import * as trpcExpress from "@trpc/server/adapters/express";
import redisClient from "./utils/connectRedis";
import customConfig from "./config/default";
import connectDB from "./utils/prisma";
import { deserializeUser } from "./middleware/deserializeUser";
import {
  createFileSchema,
  CreateFolderInput,
  createFolderSchema,
  createUserSchema,
  deleteFileSchema,
  deleteFolderSchema,
  loginUserSchema,
} from "./schema/user.schema";
import { expressHandler } from "trpc-playground/handlers/express";
import {
  loginHandler,
  logoutHandler,
  refreshAccessTokenHandler,
  registerHandler,
} from "./controllers/auth.controller";
import {
  createFileHandler,
  createFolderHandler,
  deleteFileHandler,
  deleteFolderHandler,
  getCurrentUserHandler,
} from "./controllers/user.controller";
import cookieParser from "cookie-parser";

dotenv.config({ path: path.join(__dirname, "./.env") });

const createContext = ({ req, res }: trpcExpress.CreateExpressContextOptions) =>
  deserializeUser({ req, res });

export type Context = inferAsyncReturnType<typeof createContext>;

export const t = initTRPC.context<Context>().create();

const authRouter = t.router({
  registerUser: t.procedure
    .input(createUserSchema)
    .mutation(({ input }) => registerHandler({ input })),
  loginUser: t.procedure
    .input(loginUserSchema)
    .mutation(({ input, ctx }) => loginHandler({ input, ctx })),
  logoutUser: t.procedure.mutation(({ ctx }) => logoutHandler({ ctx })),
  refreshToken: t.procedure.query(({ ctx }) =>
    refreshAccessTokenHandler({ ctx })
  ),
});

const isAuthorized = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next();
});

const isAuthorizedProcedure = t.procedure.use(isAuthorized);

const userRouter = t.router({
  sayHello: t.procedure.query(async () => {
    const message = await redisClient.get("tRPC");
    return { message };
  }),
  getCurrentUser: isAuthorizedProcedure.query(({ ctx }) =>
    getCurrentUserHandler({ ctx })
  ),
  createFolder: isAuthorizedProcedure
    .input(createFolderSchema)
    .mutation(({ input, ctx }) => createFolderHandler({ input, ctx })),
  createFile: isAuthorizedProcedure
    .input(createFileSchema)
    .mutation(({ input, ctx }) => createFileHandler({ input, ctx })),
  deleteFile: isAuthorizedProcedure
    .input(deleteFileSchema)
    .mutation(({ input, ctx }) => deleteFileHandler({ input, ctx })),
  deleteFolder: isAuthorizedProcedure
    .input(deleteFolderSchema)
    .mutation(({ input, ctx }) => deleteFolderHandler({ input, ctx })),
});

const appRouter = t.mergeRouters(authRouter, userRouter);

export type AppRouter = typeof appRouter;

const app = express();
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

app.use(cookieParser());
app.use(
  cors({
    origin: [customConfig.origin, "http://localhost:3000"],
    credentials: true,
  })
);
app.use(
  "/api/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// setup trpc-playground
expressHandler({
  trpcApiEndpoint: "/api/trpc",
  playgroundEndpoint: "/api/trpc-playground",
  router: appRouter,
}).then((handeler: any) => {
  app.use(handeler);
});

const port = customConfig.port;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  connectDB();
});

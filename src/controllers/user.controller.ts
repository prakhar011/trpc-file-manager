import {
  CreateFileInput,
  CreateFolderInput,
  DeleteFileInput,
  DeleteFolderInput,
} from "./../schema/user.schema";
import path from "path";
import { TRPCError } from "@trpc/server";
import { Context } from "../app";
import { Prisma } from "@prisma/client";

import { Glob } from "glob";
import fs, { rename } from "fs-extra";
import { promisify } from "util";
import { join } from "path";
import { unlink, readdir, rmdir } from "fs-extra";

export const getCurrentUserHandler = ({ ctx }: { ctx: Context }) => {
  try {
    const user = ctx.user;
    return {
      status: "success",
      data: {
        user,
      },
    };
  } catch (err: any) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: err.message,
    });
  }
};

const ROOT_DIR = process.env.PWD + "/files";

const isSubDirectory = (parentDir: string, subDir: string): boolean => {
  const relative = path.relative(parentDir, subDir);
  return !!relative && !relative.startsWith("..") && !path.isAbsolute(relative);
};

/*
Implement these APIs
1. Can create folders, files and nested folders.
2. If parent deleted all the children should be brought one level up (Should not be deleted)
3. Cycles should not be there
*/

export const createFolderHandler = async ({
  ctx,
  input,
}: {
  ctx: Context;
  input: CreateFolderInput;
}) => {
  try {
    const { name, folderPath } = input;

    const exactPath = path.join(ROOT_DIR, folderPath, name);

    // check if folder exists
    if (fs.existsSync(exactPath)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Folder already exists",
      });
    }

    // check if path is not subdirectory of ROOT_DIR
    if (!isSubDirectory(ROOT_DIR, exactPath)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Folder path is invalid",
      });
    }

    await fs.mkdir(exactPath, { recursive: true });

    console.log(ROOT_DIR, exactPath);
    return {
      status: "success",
      data: {
        message: "Folder created successfully",
      },
    };
  } catch (err: any) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: err.message,
    });
  }
};

export const createFileHandler = async ({
  ctx,
  input,
}: {
  ctx: Context;
  input: CreateFileInput;
}) => {
  try {
    const { name, folderPath, data } = input;

    let exactPath = path.join(ROOT_DIR, folderPath);

    // check if folder exists
    if (!fs.existsSync(exactPath)) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Folder does not exist",
      });
    }

    exactPath = path.join(exactPath, name);

    // check if path is not subdirectory of ROOT_DIR
    if (!isSubDirectory(ROOT_DIR, exactPath)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "File path is invalid",
      });
    }

    await fs.writeFile(exactPath, data);

    return {
      status: "success",
      data: {
        message: "File created successfully",
      },
    };
  } catch (err: any) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: err.message,
    });
  }
};

export const deleteFolderHandler = async ({
  ctx,
  input,
}: {
  ctx: Context;
  input: DeleteFolderInput;
}) => {
  try {
    const { folderPath } = input;

    const exactPath = path.join(ROOT_DIR, folderPath);

    // check if folder exists
    if (!fs.existsSync(exactPath)) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Folder does not exist",
      });
    }

    // move all files and folders in this folder one level up
    const files = await readdir(exactPath);
    for (const file of files) {
      const filePath = path.join(exactPath, file);
      const newFilePath = path.join(path.dirname(exactPath), file);
      await rename(filePath, newFilePath);
    }

    // delete the folder
    await promisify(rmdir)(exactPath);

    return {
      status: "success",
      data: {
        message: "Folder deleted successfully",
      },
    };
  } catch (err: any) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: err.message,
    });
  }
};

export const deleteFileHandler = async ({
  ctx,
  input,
}: {
  ctx: Context;
  input: DeleteFileInput;
}) => {
  try {
    const { filePath } = input;

    const exactPath = path.join(ROOT_DIR, filePath);

    // check if file exists
    if (!fs.existsSync(exactPath)) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "File does not exist",
      });
    }

    // check if path is not subdirectory of ROOT_DIR

    if (!isSubDirectory(ROOT_DIR, exactPath)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "File path is invalid",
      });
    }
    await unlink(exactPath);

    return {
      status: "success",
      data: {
        message: "File deleted successfully",
      },
    };
  } catch (err: any) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: err.message,
    });
  }
};

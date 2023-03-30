import { object, string, TypeOf } from "zod";

export const createUserSchema = object({
  name: string({ required_error: "Name is required" }),
  email: string({ required_error: "Email is required" }).email("Invalid email"),
  password: string({ required_error: "Password is required" })
    .min(8, "Password must be more than 8 characters")
    .max(32, "Password must be less than 32 characters"),
  passwordConfirm: string({ required_error: "Please confirm your password" }),
}).refine((data) => data.password === data.passwordConfirm, {
  path: ["passwordConfirm"],
  message: "Passwords do not match",
});

export const loginUserSchema = object({
  email: string({ required_error: "Email is required" }).email(
    "Invalid email or password"
  ),
  password: string({ required_error: "Password is required" }).min(
    8,
    "Invalid email or password"
  ),
});

export const createFolderSchema = object({
  name: string({ required_error: "Folder name is required" }),
  folderPath: string().default(""),
});

export const createFileSchema = object({
  name: string({ required_error: "File name is required" }),
  data: string({ required_error: "File data is required" }),
  folderPath: string().default(""),
});

export const deleteFileSchema = object({
  filePath: string({ required_error: "File name is required" }),
});

export const deleteFolderSchema = object({
  folderPath: string({ required_error: "Folder path is required" }),
}).refine((data) =>  (data.folderPath !== "" && data.folderPath!=="/"), {
  path: ["folderPath"],
  message: "Cannot delete root folder",
});

export type CreateUserInput = TypeOf<typeof createUserSchema>;
export type LoginUserInput = TypeOf<typeof loginUserSchema>;
export type CreateFolderInput = TypeOf<typeof createFolderSchema>;
export type CreateFileInput = TypeOf<typeof createFileSchema>;
export type DeleteFileInput = TypeOf<typeof deleteFileSchema>;
export type DeleteFolderInput = TypeOf<typeof deleteFolderSchema>;

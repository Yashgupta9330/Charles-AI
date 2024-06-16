"use client"
import axios from "axios";
import { Code } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { BotAvatar } from "@/components/bot-avatar";
import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem } from "@/components/ui/form";
import { Loader } from "@/components/loader";
import { UserAvatar } from "@/components/user-avatar";
import { Empty } from "@/components/empty";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  file: z.instanceof(File).nullable().refine(file => file?.size ? file.size <= 5 * 1024 * 1024 : true, "Max file size is 5MB"),
});

const CodePage = () => {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      file: null,
    },
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const formData = new FormData();
      formData.append("file", values.file as File);

      const response = await axios.post("/api/code", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Add new messages in reverse order
      setMessages((current) => [
        { role: "bot", content: response.data.refinedHtml },
        { role: "bot", content: response.data.initialHtml },
        { role: "bot", content: response.data.refinedDescription },
        { role: "bot", content: response.data.description },
        { role: "user", content: "Uploaded Image" },
        ...current,
      ]);

      form.reset();
    } catch (error: any) {
      console.error(error);
    }
  };

  return (
    <div>
      <Heading
        title="Code Generation"
        description="Generate code using descriptive text."
        icon={Code}
        iconColor="text-green-700"
        bgColor="bg-green-700/10"
      />
      <div className="px-4 lg:px-8">
        <div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="
                rounded-lg 
                border 
                w-full 
                p-4 
                px-3 
                md:px-6 
                focus-within:shadow-sm
                grid
                grid-cols-12
                gap-2
              "
            >
              <FormField
                name="file"
                render={({ field }) => (
                  <FormItem className="col-span-12 lg:col-span-10">
                    <Input
                      type="file"
                      accept="image/*"
                      className="border-0 outline-none focus-visible:ring-0 focus-visible:ring-transparent"
                      disabled={isLoading}
                      onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)}
                    />
                  </FormItem>
                )}
              />
              <Button className="col-span-12 lg:col-span-2 w-full" type="submit" disabled={isLoading} size="icon">
                Generate
              </Button>
            </form>
          </Form>
        </div>
        <div className="space-y-4 mt-4">
          {isLoading && (
            <div className="p-8 rounded-lg w-full flex items-center justify-center bg-muted">
              <Loader />
            </div>
          )}
          {messages.length === 0 && !isLoading && (
            <Empty label="File is empty." />
          )}
            <div className="flex flex-col-reverse gap-y-4">
                {messages.map((message, index) => (
                <div
                    key={index}
                    className={cn(
                    "p-8 w-full flex items-start gap-x-8 rounded-lg",
                    message.role === "user" ? "bg-white border border-black/10" : "bg-muted",
                    )}
                >
                    {message.role === "user" ? <UserAvatar /> : <BotAvatar />}
                    <ReactMarkdown
                    components={{
                        code: ({ node, ...props }) => (
                        <code className="bg-black/10 rounded-lg p-1" {...props} />
                        ),
                    }}
                    className="text-sm overflow-hidden leading-7"
                    >
                    {message.content || ""}
                    </ReactMarkdown>
                </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodePage;

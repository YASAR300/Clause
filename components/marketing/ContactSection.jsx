"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Loader2, MessageSquare } from "lucide-react";

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error("Please fill out all fields before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to submit message.");
      }

      toast.success(data.message || "Message sent successfully!");
      setFormData({ name: "", email: "", message: "" });
    } catch (err) {
      toast.error(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-24 border-b border-border/60 bg-surface/30">
      <div className="mx-auto max-w-4xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
          {/* Left Narrative */}
          <div className="md:col-span-5 space-y-4">
            <Badge
              variant="outline"
              className="border-border bg-surface px-3 py-1 text-xs"
            >
              Get in Touch
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text">
              Have questions about contract verification?
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Whether you are an enterprise legal team evaluating high-volume ingestion
              or have questions regarding custom LLM security boundaries, we are ready to assist.
            </p>

            <div className="pt-4 space-y-2 text-xs text-muted font-mono">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent" />
                <span>support@clause.app</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-accent" />
                <span>Direct response within 24 hours</span>
              </div>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="md:col-span-7 rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="contact-name" className="text-xs font-medium text-text">
                  Your Name
                </label>
                <Input
                  id="contact-name"
                  type="text"
                  placeholder="Sarah Jenkins"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={submitting}
                  className="bg-elevated border-border text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-email" className="text-xs font-medium text-text">
                  Work Email
                </label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="sarah@company.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  disabled={submitting}
                  className="bg-elevated border-border text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="contact-message" className="text-xs font-medium text-text">
                  Message
                </label>
                <Textarea
                  id="contact-message"
                  rows={4}
                  placeholder="Tell us about your contract volume and workflow requirements..."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, message: e.target.value }))
                  }
                  disabled={submitting}
                  className="bg-elevated border-border text-xs resize-none"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-accent hover:bg-accent/90 text-white gap-2 text-xs font-medium h-10"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending message...</span>
                  </>
                ) : (
                  <>
                    <span>Send Message</span>
                    <Send className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

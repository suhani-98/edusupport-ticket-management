import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { LoadingState } from "../components/ui/LoadingState";
import { TextArea } from "../components/ui/TextArea";
import { ApiError } from "../services/api";
import { getCategories } from "../services/category.service";
import { createTicket } from "../services/ticket.service";
import { DESCRIPTION_MAX_LENGTH, SUBJECT_MAX_LENGTH, type Category } from "../types/ticket";

export function CreateTicketPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getCategories()
      .then((response) => {
        if (!active) {
          return;
        }
        const activeCategories = response.categories.filter((category) => category.isActive);
        setCategories(activeCategories);
        setCategoryId(activeCategories[0]?.id ?? "");
      })
      .catch((caught: unknown) => {
        if (active) {
          setLoadError(caught instanceof ApiError ? caught.message : "Unable to load categories. Please try again.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();
    if (!categoryId) {
      nextErrors.categoryId = "Category is required.";
    }
    if (!trimmedSubject) {
      nextErrors.subject = "Subject is required.";
    } else if (trimmedSubject.length > SUBJECT_MAX_LENGTH) {
      nextErrors.subject = `Subject must be at most ${SUBJECT_MAX_LENGTH} characters.`;
    }
    if (!trimmedDescription) {
      nextErrors.description = "Description is required.";
    } else if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) {
      nextErrors.description = `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`;
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const response = await createTicket({
        categoryId,
        subject: trimmedSubject,
        description: trimmedDescription,
      });
      navigate(`/student/tickets/${response.ticket.id}`, {
        replace: true,
        state: { createdTicketNumber: response.ticket.ticketNumber },
      });
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : "The ticket could not be created. Please try again.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading categories…" />;
  }

  return (
    <Card>
      <h1 className="text-2xl font-semibold text-slate-900">Create ticket</h1>
      <p className="mt-2 text-sm text-slate-600">
        Priority, status, and the SLA deadline are set by the help desk from the category you choose.
      </p>
      {loadError ? (
        <div className="mt-4">
          <Alert>{loadError}</Alert>
        </div>
      ) : null}
      {categories.length === 0 && !loadError ? (
        <p className="mt-4 text-sm text-slate-700">No active categories are available right now.</p>
      ) : null}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-800" htmlFor="categoryId">
          Category
          <select
            id="categoryId"
            name="categoryId"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus-visible:border-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-800"
            aria-invalid={fieldErrors.categoryId ? true : undefined}
            aria-describedby={fieldErrors.categoryId ? "categoryId-error" : undefined}
            required
          >
            {categories.length === 0 ? <option value="">No categories</option> : null}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId ? (
            <span id="categoryId-error" className="mt-1 block text-sm font-normal text-red-700">
              {fieldErrors.categoryId}
            </span>
          ) : null}
        </label>
        <Input
          label="Subject"
          name="subject"
          value={subject}
          maxLength={SUBJECT_MAX_LENGTH}
          onChange={(event) => setSubject(event.target.value)}
          error={fieldErrors.subject}
          required
        />
        <TextArea
          label="Description"
          name="description"
          value={description}
          rows={6}
          maxLength={DESCRIPTION_MAX_LENGTH}
          onChange={(event) => setDescription(event.target.value)}
          error={fieldErrors.description}
          required
        />
        {formError ? <Alert>{formError}</Alert> : null}
        <Button type="submit" loading={submitting} disabled={categories.length === 0}>
          Submit ticket
        </Button>
      </form>
    </Card>
  );
}

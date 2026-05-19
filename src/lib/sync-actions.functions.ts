import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { audit } from "@/lib/audit.server";

type ActionItemForSync = {
  id: string;
  owner_id: string;
  what: string;
  who_name: string | null;
  who_email: string | null;
  due_date: string | null;
  priority: string;
  risk_score: number | null;
  risk_reason: string | null;
  verbatim_quote: string | null;
  asana_task_gid: string | null;
  asana_task_url: string | null;
  jira_issue_key: string | null;
  jira_issue_url: string | null;
  notion_page_id: string | null;
  notion_page_url: string | null;
  meetings: { title: string | null } | null;
};

export const syncActionItemToAsana = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const token = process.env.ASANA_ACCESS_TOKEN;
    const projectGid = process.env.ASANA_PROJECT_GID;
    if (!token || !projectGid) throw new Error("Asana integration is not configured.");

    const item = await loadItemForSync(supabase, data.itemId);
    if (item.asana_task_gid && item.asana_task_url) {
      return { url: item.asana_task_url, reused: true };
    }

    const response = await fetch("https://app.asana.com/api/1.0/tasks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          name: item.what,
          projects: [projectGid],
          due_on: item.due_date ? new Date(item.due_date).toISOString().slice(0, 10) : undefined,
          notes: buildSyncNotes(item),
        },
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.errors?.[0]?.message ?? `Asana ${response.status}`);
    }

    const gid = payload.data.gid as string;
    const url = payload.data.permalink_url ?? `https://app.asana.com/0/${projectGid}/${gid}`;
    const { error } = await supabase
      .from("action_items")
      .update({ asana_task_gid: gid, asana_task_url: url })
      .eq("id", item.id);
    if (error) throw new Error(error.message);

    await audit({
      owner_id: userId,
      event_type: "asana_sync",
      status: "success",
      message: `Created Asana task for "${item.what.slice(0, 80)}"`,
      action_item_id: item.id,
      metadata: { asana_task_gid: gid, asana_task_url: url },
    });

    return { url, reused: false };
  });

export const syncActionItemToNotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const token = process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!token || !databaseId) throw new Error("Notion integration is not configured.");

    const item = await loadItemForSync(supabase, data.itemId);
    if (item.notion_page_id && item.notion_page_url) {
      return { url: item.notion_page_url, reused: true };
    }

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          Name: {
            title: [{ text: { content: item.what.slice(0, 2000) } }],
          },
        },
        children: [
          paragraph(`Meeting: ${item.meetings?.title ?? "Untitled meeting"}`),
          paragraph(
            `Owner: ${item.who_name ?? "Unassigned"}${item.who_email ? ` <${item.who_email}>` : ""}`,
          ),
          paragraph(
            `Due: ${item.due_date ? new Date(item.due_date).toLocaleDateString() : "No date"}`,
          ),
          paragraph(`Priority: ${item.priority}`),
          paragraph(
            `Risk: ${item.risk_score ?? "Not scored"}${item.risk_reason ? ` - ${item.risk_reason}` : ""}`,
          ),
          paragraph(`Quote: ${item.verbatim_quote ?? "No source quote captured"}`),
        ],
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message ?? `Notion ${response.status}`);
    }

    const pageId = payload.id as string;
    const url = payload.url as string;
    const { error } = await supabase
      .from("action_items")
      .update({ notion_page_id: pageId, notion_page_url: url })
      .eq("id", item.id);
    if (error) throw new Error(error.message);

    await audit({
      owner_id: userId,
      event_type: "notion_sync",
      status: "success",
      message: `Created Notion page for "${item.what.slice(0, 80)}"`,
      action_item_id: item.id,
      metadata: { notion_page_id: pageId, notion_page_url: url },
    });

    return { url, reused: false };
  });

export const syncActionItemToJira = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const baseUrl = process.env.JIRA_BASE_URL?.replace(/\/+$/, "");
    const email = process.env.JIRA_EMAIL;
    const token = process.env.JIRA_API_TOKEN;
    const projectKey = process.env.JIRA_PROJECT_KEY;
    if (!baseUrl || !email || !token || !projectKey) {
      throw new Error("Jira integration is not configured.");
    }

    const item = await loadItemForSync(supabase, data.itemId);
    if (item.jira_issue_key && item.jira_issue_url) {
      return { url: item.jira_issue_url, reused: true };
    }

    const auth = Buffer.from(`${email}:${token}`).toString("base64");
    const issueTypeId = await getJiraTaskIssueTypeId(baseUrl, auth, projectKey);
    const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          issuetype: { id: issueTypeId },
          summary: item.what.slice(0, 255),
          description: jiraDescription(item),
        },
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        payload?.errors
          ? JSON.stringify(payload.errors)
          : (payload?.errorMessages?.[0] ?? `Jira ${response.status}`),
      );
    }

    const issueKey = payload.key as string;
    const url = `${baseUrl}/browse/${issueKey}`;
    const { error } = await supabase
      .from("action_items")
      .update({ jira_issue_key: issueKey, jira_issue_url: url })
      .eq("id", item.id);
    if (error) throw new Error(error.message);

    await audit({
      owner_id: userId,
      event_type: "jira_sync",
      status: "success",
      message: `Created Jira issue ${issueKey} for "${item.what.slice(0, 80)}"`,
      action_item_id: item.id,
      metadata: { jira_issue_key: issueKey, jira_issue_url: url },
    });

    return { url, reused: false };
  });

async function loadItemForSync(supabase: SupabaseClient<Database>, itemId: string) {
  const { data, error } = await supabase
    .from("action_items")
    .select("*, meetings(title)")
    .eq("id", itemId)
    .single();
  if (error || !data) throw new Error("Action item not found");
  return data as ActionItemForSync;
}

function buildSyncNotes(item: ActionItemForSync) {
  return [
    `Meeting: ${item.meetings?.title ?? "Untitled meeting"}`,
    `Owner: ${item.who_name ?? "Unassigned"}${item.who_email ? ` <${item.who_email}>` : ""}`,
    `Priority: ${item.priority}`,
    `Risk: ${item.risk_score ?? "Not scored"}${item.risk_reason ? ` - ${item.risk_reason}` : ""}`,
    item.verbatim_quote ? `Source quote: "${item.verbatim_quote}"` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function paragraph(content: string) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: content.slice(0, 2000) } }],
    },
  };
}

async function getJiraTaskIssueTypeId(baseUrl: string, auth: string, projectKey: string) {
  const projectResponse = await fetch(
    `${baseUrl}/rest/api/3/project/${encodeURIComponent(projectKey)}`,
    {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    },
  );
  const projectPayload = await projectResponse.json().catch(() => null);
  if (!projectResponse.ok) {
    throw new Error(
      projectPayload?.errorMessages?.[0] ?? `Jira project lookup ${projectResponse.status}`,
    );
  }

  const typesResponse = await fetch(
    `${baseUrl}/rest/api/3/issuetype/project?projectId=${encodeURIComponent(projectPayload.id)}`,
    { headers: { Authorization: `Basic ${auth}`, Accept: "application/json" } },
  );
  const typesPayload = await typesResponse.json().catch(() => null);
  if (!typesResponse.ok || !Array.isArray(typesPayload)) {
    throw new Error(
      typesPayload?.errorMessages?.[0] ?? `Jira issue type lookup ${typesResponse.status}`,
    );
  }

  const task =
    typesPayload.find((type) => type.name?.toLowerCase() === "task") ??
    typesPayload.find((type) => !type.subtask);
  if (!task?.id) throw new Error("No usable Jira issue type found for this project.");
  return task.id as string;
}

function jiraDescription(item: ActionItemForSync) {
  return {
    type: "doc",
    version: 1,
    content: [
      jiraParagraph(`Meeting: ${item.meetings?.title ?? "Untitled meeting"}`),
      jiraParagraph(
        `Owner: ${item.who_name ?? "Unassigned"}${item.who_email ? ` <${item.who_email}>` : ""}`,
      ),
      jiraParagraph(
        `Due: ${item.due_date ? new Date(item.due_date).toLocaleDateString() : "No date"}`,
      ),
      jiraParagraph(`Priority: ${item.priority}`),
      jiraParagraph(
        `Risk: ${item.risk_score ?? "Not scored"}${item.risk_reason ? ` - ${item.risk_reason}` : ""}`,
      ),
      jiraParagraph(`Source quote: ${item.verbatim_quote ?? "No source quote captured"}`),
    ],
  };
}

function jiraParagraph(text: string) {
  return {
    type: "paragraph",
    content: [{ type: "text", text: text.slice(0, 2000) }],
  };
}

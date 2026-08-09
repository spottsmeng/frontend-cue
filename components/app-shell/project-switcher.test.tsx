import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUIStore } from "@/lib/store/ui-store";

import { ProjectSwitcher } from "./project-switcher";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

const PROJECTS = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Alpha Launch" },
  { id: "22222222-2222-2222-2222-222222222222", name: "Beta Gala" },
];

describe("ProjectSwitcher", () => {
  beforeEach(() => {
    useUIStore.setState({ projectSwitcherOpen: false });
    usePathname.mockReturnValue("/");
  });

  it("shows a generic label when the URL names no project", () => {
    render(<ProjectSwitcher projects={PROJECTS} />);
    expect(screen.getByRole("button", { name: /select a project/i })).toBeInTheDocument();
  });

  it("derives and displays the active project from the URL's own /projects/:id segment", () => {
    usePathname.mockReturnValue(`/projects/${PROJECTS[1].id}/twin`);
    render(<ProjectSwitcher projects={PROJECTS} />);
    expect(screen.getByRole("button", { name: "Beta Gala" })).toBeInTheDocument();
  });

  it("opens the list on click and links to every project", async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher projects={PROJECTS} />);

    await user.click(screen.getByRole("button"));

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Alpha Launch" })).toHaveAttribute(
      "href",
      `/projects/${PROJECTS[0].id}`,
    );
  });
});

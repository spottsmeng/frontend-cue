import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { VendorMetricOut } from "@/lib/api/types";

import { VendorMetricRow } from "./vendor-metric-row";

// This milestone's own TESTING EXPECTATION: the absent-vs-unavailable split
// named in `VendorMetricOut`'s own docstring (app/parties/schema.py) — a
// metric never computed at all for this party/segment (absent from
// `VendorReliabilityOut.metrics`) is a structurally different case from one
// that *was* computed but came back `available=False` (a real
// `unavailable_reason`, e.g. FR-LED-05's supersedes chain not existing
// yet), and the two must render distinctly: absent shows no reason (there
// is nothing to explain), unavailable shows its real reason, never a
// fabricated value in either case.
function snapshot(overrides: Partial<VendorMetricOut> = {}): VendorMetricOut {
  return {
    metric: "on_time_rate",
    value: 0.5,
    available: true,
    unavailable_reason: null,
    sample_size: 2,
    computed_at: "2026-08-10T12:20:14.627286Z",
    segment_vendor_category: "av_led",
    segment_city: "Singapore",
    segment_event_archetype: null,
    ...overrides,
  };
}

describe("VendorMetricRow", () => {
  it("renders an absent metric (snapshot=null) as 'not yet computed', with no reason shown", () => {
    render(<VendorMetricRow metric="on_time_rate" snapshot={null} />);
    expect(screen.getByText("Not yet computed")).toBeInTheDocument();
    expect(screen.queryByText(/FR-LED-05/)).not.toBeInTheDocument();
    expect(screen.queryByText("Not available")).not.toBeInTheDocument();
  });

  it("renders a present, available metric with its real value, sample size and computed_at", () => {
    render(<VendorMetricRow metric="on_time_rate" snapshot={snapshot()} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText(/n=2/)).toBeInTheDocument();
    expect(screen.queryByText("Not yet computed")).not.toBeInTheDocument();
  });

  it("renders a present, unavailable metric with its real unavailable_reason, never a fabricated value", () => {
    render(
      <VendorMetricRow
        metric="revision_churn"
        snapshot={snapshot({
          metric: "revision_churn",
          value: null,
          available: false,
          unavailable_reason: "revision/supersession chains are not yet computable (FR-LED-05).",
          sample_size: 0,
        })}
      />,
    );
    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.getByText(/FR-LED-05/)).toBeInTheDocument();
    expect(screen.queryByText("Not yet computed")).not.toBeInTheDocument();
  });

  it("formats each metric's value with its own unit, never a shared raw-number format", () => {
    const { rerender } = render(
      <VendorMetricRow metric="median_response_time_days" snapshot={snapshot({ metric: "median_response_time_days", value: 6.0 })} />,
    );
    expect(screen.getByText("6.0 days")).toBeInTheDocument();

    rerender(<VendorMetricRow metric="price_drift_pct" snapshot={snapshot({ metric: "price_drift_pct", value: 12.5 })} />);
    expect(screen.getByText("12.5%")).toBeInTheDocument();

    rerender(<VendorMetricRow metric="deviation_frequency" snapshot={snapshot({ metric: "deviation_frequency", value: 0.25 })} />);
    expect(screen.getByText("0.25 per commitment")).toBeInTheDocument();
  });
});

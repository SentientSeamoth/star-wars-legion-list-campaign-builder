import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import CampaignListScreen from "./CampaignListScreen";
import CampaignDashboardScreen from "./CampaignDashboardScreen";

interface CampaignsFeatureProps {
  userId: string;
}

/**
 * Root of Campaign Mode -- mounted at "/campaigns/*" by App.tsx (see
 * Route path="/campaigns/*"). Owns its own nested routes (list vs. a
 * single campaign's dashboard) so a specific campaign gets a real,
 * shareable/refreshable URL ("/campaigns/:campaignId") instead of
 * component-local state -- 2026-08-24, closing out the "no routing,
 * doesn't scale past two screens" gap for this feature specifically. The
 * dashboard's own internal Overview/Paths/Missions/Roster/Upgrades/Story
 * tab strip stays local component state (see CampaignDashboardScreen.tsx)
 * -- an ordinary in-screen tab strip, not the same gap.
 */
export default function CampaignsFeature({ userId }: CampaignsFeatureProps) {
  return (
    <Routes>
      <Route path="/" element={<CampaignListRoute userId={userId} />} />
      <Route path="/:campaignId" element={<CampaignDashboardRoute userId={userId} />} />
    </Routes>
  );
}

function CampaignListRoute({ userId }: { userId: string }) {
  const navigate = useNavigate();
  return <CampaignListScreen userId={userId} onOpenCampaign={(id) => navigate(`/campaigns/${id}`)} />;
}

function CampaignDashboardRoute({ userId }: { userId: string }) {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  if (!campaignId) return null;
  return (
    <CampaignDashboardScreen
      campaignId={campaignId}
      userId={userId}
      onBack={() => navigate("/campaigns")}
    />
  );
}

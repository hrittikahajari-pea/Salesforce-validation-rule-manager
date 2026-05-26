import { useEffect, useMemo, useState } from "react";
import "./App.css";

const mockValidationRules = [
  {
    id: "vr-001",
    name: "Phone_Required",
    object: "Account",
    status: "Active",
    description: "Requires a phone number before saving an Account record.",
  },
  {
    id: "vr-002",
    name: "Website_Required",
    object: "Account",
    status: "Inactive",
    description: "Ensures the Website field is provided for business accounts.",
  },
  {
    id: "vr-003",
    name: "Employees_Cannot_Be_Negative",
    object: "Account",
    status: "Active",
    description: "Prevents Number of Employees from being saved below zero.",
  },
  {
    id: "vr-004",
    name: "Account_Name_Min_Length",
    object: "Account",
    status: "Active",
    description: "Requires Account Name to meet a minimum character length.",
  },
  {
    id: "vr-005",
    name: "Billing_City_Required",
    object: "Account",
    status: "Inactive",
    description: "Requires Billing City when billing details are captured.",
  },
];

const processSteps = [
  "Salesforce OAuth",
  "Tooling/Metadata API",
  "Validation Rule Toggle",
  "Deploy Changes",
];

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [salesforceAuth, setSalesforceAuth] = useState({
    accessToken: "",
    instanceUrl: "",
  });
  const [validationRules, setValidationRules] = useState([]);
  const [changedRules, setChangedRules] = useState([]);
  const [areRulesLoaded, setAreRulesLoaded] = useState(false);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [hasUndeployedChanges, setHasUndeployedChanges] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("info");

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get("access_token");
    const instanceUrl = hashParams.get("instance_url");

    if (accessToken) {
      setIsLoggedIn(true);
      setSalesforceAuth({
        accessToken,
        instanceUrl: instanceUrl || "",
      });
      setStatusMessage("Connected successfully.");
      setStatusType("success");

      window.history.replaceState(
        null,
        document.title,
        `${window.location.pathname}${window.location.search}`
      );
    }
  }, []);

  const activeRuleCount = useMemo(
    () => validationRules.filter((rule) => rule.status === "Active").length,
    [validationRules]
  );

  const inactiveRuleCount = validationRules.length - activeRuleCount;

  const handleLogin = () => {
    const clientId = import.meta.env.VITE_SALESFORCE_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_SALESFORCE_REDIRECT_URI;
    const loginUrl = import.meta.env.VITE_SALESFORCE_LOGIN_URL;

    if (!clientId || !redirectUri || !loginUrl) {
      setStatusMessage("Salesforce OAuth configuration is missing.");
      setStatusType("warning");
      return;
    }

    const normalizedLoginUrl = loginUrl.replace(/\/$/, "");
    const authParams = new URLSearchParams({
      response_type: "token",
      client_id: clientId,
      redirect_uri: redirectUri,
    });

    window.location.href = `${normalizedLoginUrl}/services/oauth2/authorize?${authParams.toString()}`;
  };

  const handleGetValidationRules = async () => {
    if (!salesforceAuth.accessToken || !salesforceAuth.instanceUrl) {
      setStatusMessage(
        "Salesforce session details are missing. Please login again."
      );
      setStatusType("warning");
      return;
    }

    setIsLoadingRules(true);
    setStatusMessage("Loading validation rules...");
    setStatusType("info");

    try {
      const response = await fetch("http://localhost:4000/api/validation-rules", {
        headers: {
          Authorization: `Bearer ${salesforceAuth.accessToken}`,
          "x-instance-url": salesforceAuth.instanceUrl,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let salesforceErrorMessage = errorBody;

        try {
          const parsedError = JSON.parse(errorBody);
          salesforceErrorMessage = Array.isArray(parsedError)
            ? parsedError
                .map((error) => error.message || JSON.stringify(error))
                .join(" ")
            : parsedError.message || errorBody;
        } catch {
          salesforceErrorMessage = errorBody || response.statusText;
        }

        throw new Error(salesforceErrorMessage);
      }

      const data = await response.json();

      setValidationRules(data);
      setChangedRules([]);
      setAreRulesLoaded(true);
      setHasUndeployedChanges(false);
      setStatusMessage("Validation rules loaded successfully.");
      setStatusType("success");
    } catch (error) {
      console.error("Validation rule fetch failed:", error);

      setValidationRules(mockValidationRules);
      setChangedRules([]);
      setAreRulesLoaded(true);
      setHasUndeployedChanges(false);
      setStatusMessage(
        `Salesforce error: ${error.message}. Showing demo fallback rules.`
      );
      setStatusType("warning");
    } finally {
      setIsLoadingRules(false);
    }
  };

  const handleToggleRule = (ruleId) => {
    if (!areRulesLoaded) {
      return;
    }

    const ruleToToggle = validationRules.find((rule) => rule.id === ruleId);

    if (!ruleToToggle) {
      return;
    }

    const nextStatus =
      ruleToToggle.status === "Active" ? "Inactive" : "Active";
    const changedRule = {
      id: ruleToToggle.id,
      name: ruleToToggle.name,
      object: ruleToToggle.object,
      active: nextStatus === "Active",
    };

    setValidationRules((currentRules) =>
      currentRules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              status: nextStatus,
            }
          : rule
      )
    );

    setChangedRules((currentChanges) => {
      const existingChangeIndex = currentChanges.findIndex(
        (rule) => rule.id === changedRule.id
      );

      if (existingChangeIndex === -1) {
        return [...currentChanges, changedRule];
      }

      return currentChanges.map((rule, index) =>
        index === existingChangeIndex ? changedRule : rule
      );
    });

    setHasUndeployedChanges(true);
    setStatusMessage("You have undeployed changes.");
    setStatusType("warning");
  };

  const handleDeployChanges = async () => {
    if (!salesforceAuth.accessToken || !salesforceAuth.instanceUrl) {
      setStatusMessage(
        "Salesforce session details are missing. Please login again."
      );
      setStatusType("warning");
      return;
    }

    if (changedRules.length === 0) {
      setStatusMessage("There are no validation rule changes to deploy.");
      setStatusType("info");
      return;
    }

    setIsDeploying(true);
    setStatusMessage("Deploy changes pending.");
    setStatusType("info");

    try {
      const response = await fetch(
        "http://localhost:4000/api/deploy-validation-rules",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${salesforceAuth.accessToken}`,
            "Content-Type": "application/json",
            "x-instance-url": salesforceAuth.instanceUrl,
          },
          body: JSON.stringify({ changes: changedRules }),
        }
      );

      const responseText = await response.text();
      const responseData = responseText ? JSON.parse(responseText) : {};

      if (!response.ok) {
        throw new Error(
          responseData.message || response.statusText || "Deployment failed."
        );
      }

      setChangedRules([]);
      setHasUndeployedChanges(false);
      setStatusMessage(responseData.message || "Changes deployed successfully.");
      setStatusType("success");
    } catch (error) {
      console.error("Validation rule deployment failed:", error);

      setStatusMessage(`Deployment failed: ${error.message}`);
      setStatusType("warning");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <main className="app-shell">
      {/* Header and primary Salesforce connection actions */}
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Associate Software Engineer Assignment</p>
          <h1>Salesforce Validation Rule Manager</h1>
          <p className="hero-subtitle">
            Connect securely with Salesforce OAuth, review Account validation
            rules, and prepare controlled rule updates for deployment.
          </p>
        </div>

        <div className="hero-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={handleLogin}
            disabled={isLoggedIn}
          >
            {isLoggedIn ? "Connected to Salesforce" : "Login with Salesforce"}
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={handleGetValidationRules}
            disabled={!isLoggedIn || isLoadingRules}
          >
            {isLoadingRules ? "Loading Rules..." : "Get Validation Rules"}
          </button>
        </div>
      </section>

      {statusMessage && (
        <div className={`status-message status-message-${statusType}`}>
          {statusMessage}
        </div>
      )}

      <section className="dashboard-grid">
        {/* Mock org context that will later come from the OAuth session */}
        <aside className="info-card">
          <div className="card-header">
            <div>
              <p className="section-label">Connected Org</p>
              <h2>Salesforce Developer Org</h2>
            </div>
            <span
              className={`connection-pill ${
                isLoggedIn ? "connection-pill-success" : ""
              }`}
            >
              {isLoggedIn ? "Authenticated" : "Not Connected"}
            </span>
          </div>

          <dl className="org-details">
            <div>
              <dt>User</dt>
              <dd>Hrittika Hajari</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>hrittikahajari@gmail.com</dd>
            </div>
            <div>
              <dt>Instance</dt>
              <dd>
                {salesforceAuth.instanceUrl || "https://demo.my.salesforce.com"}
              </dd>
            </div>
            <div>
              <dt>Object</dt>
              <dd>Account</dd>
            </div>
          </dl>

          <div className="summary-row">
            <div className="summary-item">
              <span>{validationRules.length}</span>
              <p>Total Rules</p>
            </div>
            <div className="summary-item">
              <span>{activeRuleCount}</span>
              <p>Active</p>
            </div>
            <div className="summary-item">
              <span>{inactiveRuleCount}</span>
              <p>Inactive</p>
            </div>
          </div>
        </aside>

        {/* Validation rules table with local mock-state toggles */}
        <section className="rules-panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Account Validation Rules</p>
              <h2>Rule Inventory</h2>
            </div>
            <button
              className="button button-primary"
              type="button"
              onClick={handleDeployChanges}
              disabled={!hasUndeployedChanges || isDeploying}
            >
              {isDeploying ? "Deploying..." : "Deploy Changes"}
            </button>
          </div>

          {areRulesLoaded && (
            <div className="table-wrapper">
              <table className="rules-table">
                <thead>
                  <tr>
                    <th>Rule Name</th>
                    <th>Object</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {validationRules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="rule-name">{rule.name}</td>
                      <td>{rule.object}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            rule.status === "Active"
                              ? "status-active"
                              : "status-inactive"
                          }`}
                        >
                          {rule.status}
                        </span>
                      </td>
                      <td>{rule.description}</td>
                      <td>
                        <button
                          className="button button-ghost"
                          type="button"
                          onClick={() => handleToggleRule(rule.id)}
                          disabled={!areRulesLoaded}
                        >
                          Set {rule.status === "Active" ? "Inactive" : "Active"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!areRulesLoaded && (
            <p className="empty-state">
              No validation rules loaded yet. Click Get Validation Rules to
              fetch Account validation rules from Salesforce.
            </p>
          )}
        </section>
      </section>

      {/* High-level implementation flow for interview discussion */}
      <section className="architecture-section">
        <div className="section-heading">
          <p className="section-label">Planned Architecture</p>
          <h2>OAuth to Metadata Deployment Flow</h2>
        </div>

        <div className="process-flow">
          {processSteps.map((step, index) => (
            <div className="process-step" key={step}>
              <span className="step-number">{index + 1}</span>
              <p>{step}</p>
              {index < processSteps.length - 1 && (
                <span className="step-connector" aria-hidden="true">
                  &rarr;
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
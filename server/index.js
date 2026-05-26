const cors = require("cors");
const express = require("express");
const jsforce = require("jsforce");

const app = express();
const PORT = 4000;

const validationRuleQuery =
  "SELECT Id, ValidationName, Active, Description, EntityDefinition.QualifiedApiName FROM ValidationRule WHERE EntityDefinition.QualifiedApiName = 'Account'";

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/validation-rules", async (req, res) => {
  const authorizationHeader = req.get("authorization");
  const instanceUrl = req.get("x-instance-url");

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing Salesforce Authorization bearer token." });
  }

  if (!instanceUrl) {
    return res.status(400).json({ message: "Missing Salesforce instance URL." });
  }

  const normalizedInstanceUrl = instanceUrl.replace(/\/$/, "");
  const toolingApiUrl = `${normalizedInstanceUrl}/services/data/v59.0/tooling/query/?q=${encodeURIComponent(validationRuleQuery)}`;

  try {
    const salesforceResponse = await fetch(toolingApiUrl, {
      headers: { Authorization: authorizationHeader },
    });
    const responseText = await salesforceResponse.text();

    if (!salesforceResponse.ok) {
      let message = responseText || salesforceResponse.statusText;

      try {
        const parsedError = JSON.parse(responseText);
        message = Array.isArray(parsedError)
          ? parsedError.map((error) => error.message || JSON.stringify(error)).join(" ")
          : parsedError.message || message;
      } catch {
        message = responseText || salesforceResponse.statusText;
      }

      return res.status(salesforceResponse.status).json({ message });
    }

    const data = responseText ? JSON.parse(responseText) : {};
    const validationRules = (data.records || []).map((rule) => ({
      id: rule.Id,
      name: rule.ValidationName,
      object: rule.EntityDefinition?.QualifiedApiName || "Account",
      status: rule.Active ? "Active" : "Inactive",
      description: rule.Description || "No description provided.",
    }));

    return res.json(validationRules);
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Unable to fetch validation rules.",
    });
  }
});

app.post("/api/deploy-validation-rules", async (req, res) => {
  const authorizationHeader = req.get("authorization");
  const instanceUrl = req.get("x-instance-url");
  const changes = req.body?.changes;

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing Salesforce Authorization bearer token." });
  }

  if (!instanceUrl) {
    return res.status(400).json({ message: "Missing Salesforce instance URL." });
  }

  if (!Array.isArray(changes) || changes.length === 0) {
    return res.status(400).json({ message: "No validation rule changes were provided." });
  }

  const normalizedInstanceUrl = instanceUrl.replace(/\/$/, "");
  const accessToken = authorizationHeader.replace(/^Bearer\s+/i, "");
  const connection = new jsforce.Connection({
    instanceUrl: normalizedInstanceUrl,
    accessToken,
    version: "59.0",
  });

  const fullNames = changes.map((change) => `${change.object}.${change.name}`);

  try {
    const existingMetadataResponse = await connection.metadata.read(
      "ValidationRule",
      fullNames
    );

    const existingMetadata = Array.isArray(existingMetadataResponse)
      ? existingMetadataResponse
      : [existingMetadataResponse];

    const metadataByFullName = new Map(
      existingMetadata.filter(Boolean).map((metadata) => [metadata.fullName, metadata])
    );

    const updates = changes.map((change) => {
      const fullName = `${change.object}.${change.name}`;
      const metadata = metadataByFullName.get(fullName);

      if (!metadata) {
        throw new Error(`Could not read metadata for ${fullName}.`);
      }

      return {
        ...metadata,
        fullName,
        active: Boolean(change.active),
      };
    });

    const updateResponse = await connection.metadata.update("ValidationRule", updates);
    const results = Array.isArray(updateResponse) ? updateResponse : [updateResponse];
    const failures = results.filter((result) => !result.success);

    if (failures.length > 0) {
      return res.status(502).json({
        message: "Salesforce rejected one or more validation rule updates.",
        results,
      });
    }

    return res.json({
      message: "Changes deployed successfully.",
      results,
    });
  } catch (error) {
    console.error("Validation rule deployment failed:", error);

    return res.status(500).json({
      message: error.message || "Unable to deploy validation rule changes.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Salesforce validation rule proxy running on port ${PORT}`);
});
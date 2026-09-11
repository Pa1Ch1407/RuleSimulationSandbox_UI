import { RuleSetRequest } from './models';

/** The rule sets from docs/TEST_RULE_SETS.md, with their expected results documented there. */
export const EXAMPLES: { label: string; ruleSet: RuleSetRequest }[] = [
  {
    "label": "Duplicate handling (simple, one rule)",
    "ruleSet": {
      "name": "Duplicate handling",
      "enabled": true,
      "rules": [
        {
          "name": "Decline flagged duplicates",
          "priority": 100,
          "enabled": true,
          "conditionJoin": "AND",
          "action": "AUTO_DECLINE",
          "displayOrder": 1,
          "conditions": [
            {
              "field": "flagged_duplicate",
              "operator": "IS_TRUE",
              "value": null,
              "values": null
            }
          ]
        }
      ]
    }
  },
  {
    "label": "Safer duplicate handling (AND)",
    "ruleSet": {
      "name": "Safer duplicate handling",
      "enabled": true,
      "rules": [
        {
          "name": "Decline undocumented duplicates",
          "priority": 100,
          "enabled": true,
          "conditionJoin": "AND",
          "action": "AUTO_DECLINE",
          "displayOrder": 1,
          "conditions": [
            {
              "field": "flagged_duplicate",
              "operator": "IS_TRUE",
              "value": null,
              "values": null
            },
            {
              "field": "has_documentation",
              "operator": "IS_FALSE",
              "value": null,
              "values": null
            }
          ]
        }
      ]
    }
  },
  {
    "label": "Specialist routing (OR, IN, numeric)",
    "ruleSet": {
      "name": "Specialist routing",
      "enabled": true,
      "rules": [
        {
          "name": "Frequent requesters to specialist",
          "priority": 90,
          "enabled": true,
          "conditionJoin": "AND",
          "action": "ROUTE_SPECIALIST",
          "displayOrder": 1,
          "conditions": [
            {
              "field": "prior_requests_90d",
              "operator": "GTE",
              "value": "10",
              "values": null
            }
          ]
        },
        {
          "name": "High value or class D to specialist",
          "priority": 80,
          "enabled": true,
          "conditionJoin": "OR",
          "action": "ROUTE_SPECIALIST",
          "displayOrder": 2,
          "conditions": [
            {
              "field": "declared_value",
              "operator": "GTE",
              "value": "10000",
              "values": null
            },
            {
              "field": "item_class",
              "operator": "IN",
              "value": null,
              "values": [
                "CLASS_D"
              ]
            }
          ]
        }
      ]
    }
  },
  {
    "label": "Trusted customer fast-track (auto-approve)",
    "ruleSet": {
      "name": "Trusted customer fast-track",
      "enabled": true,
      "rules": [
        {
          "name": "Fast-track small documented premium requests",
          "priority": 50,
          "enabled": true,
          "conditionJoin": "AND",
          "action": "AUTO_APPROVE",
          "displayOrder": 1,
          "conditions": [
            {
              "field": "account_tier",
              "operator": "IN",
              "value": null,
              "values": [
                "GOLD",
                "PLATINUM"
              ]
            },
            {
              "field": "has_documentation",
              "operator": "IS_TRUE",
              "value": null,
              "values": null
            },
            {
              "field": "declared_value",
              "operator": "LT",
              "value": "500",
              "values": null
            },
            {
              "field": "flagged_duplicate",
              "operator": "IS_FALSE",
              "value": null,
              "values": null
            },
            {
              "field": "channel",
              "operator": "NOT_IN",
              "value": null,
              "values": [
                "PHONE"
              ]
            }
          ]
        }
      ]
    }
  },
  {
    "label": "Full production candidate (priority + tie-break)",
    "ruleSet": {
      "name": "Full production candidate",
      "enabled": true,
      "rules": [
        {
          "name": "Decline undocumented duplicates",
          "priority": 100,
          "enabled": true,
          "conditionJoin": "AND",
          "action": "AUTO_DECLINE",
          "displayOrder": 1,
          "conditions": [
            {
              "field": "flagged_duplicate",
              "operator": "IS_TRUE",
              "value": null,
              "values": null
            },
            {
              "field": "has_documentation",
              "operator": "IS_FALSE",
              "value": null,
              "values": null
            }
          ]
        },
        {
          "name": "Frequent requesters to specialist",
          "priority": 90,
          "enabled": true,
          "conditionJoin": "AND",
          "action": "ROUTE_SPECIALIST",
          "displayOrder": 2,
          "conditions": [
            {
              "field": "prior_requests_90d",
              "operator": "GTE",
              "value": "10",
              "values": null
            }
          ]
        },
        {
          "name": "Very high value to specialist",
          "priority": 60,
          "enabled": true,
          "conditionJoin": "AND",
          "action": "ROUTE_SPECIALIST",
          "displayOrder": 3,
          "conditions": [
            {
              "field": "declared_value",
              "operator": "GTE",
              "value": "10000",
              "values": null
            }
          ]
        },
        {
          "name": "Old undocumented items to manual review",
          "priority": 60,
          "enabled": true,
          "conditionJoin": "AND",
          "action": "MANUAL_REVIEW",
          "displayOrder": 4,
          "conditions": [
            {
              "field": "item_age_days",
              "operator": "GTE",
              "value": "900",
              "values": null
            },
            {
              "field": "has_documentation",
              "operator": "IS_FALSE",
              "value": null,
              "values": null
            }
          ]
        },
        {
          "name": "Fast-track small documented premium requests",
          "priority": 50,
          "enabled": true,
          "conditionJoin": "AND",
          "action": "AUTO_APPROVE",
          "displayOrder": 5,
          "conditions": [
            {
              "field": "account_tier",
              "operator": "IN",
              "value": null,
              "values": [
                "GOLD",
                "PLATINUM"
              ]
            },
            {
              "field": "has_documentation",
              "operator": "IS_TRUE",
              "value": null,
              "values": null
            },
            {
              "field": "declared_value",
              "operator": "LT",
              "value": "500",
              "values": null
            },
            {
              "field": "flagged_duplicate",
              "operator": "IS_FALSE",
              "value": null,
              "values": null
            }
          ]
        }
      ]
    }
  },
  {
    "label": "Dangerous rule (what the tool is for)",
    "ruleSet": {
      "name": "Dangerous: decline all undocumented",
      "enabled": true,
      "rules": [
        {
          "name": "Decline anything without documentation",
          "priority": 100,
          "enabled": true,
          "conditionJoin": "AND",
          "action": "AUTO_DECLINE",
          "displayOrder": 1,
          "conditions": [
            {
              "field": "has_documentation",
              "operator": "IS_FALSE",
              "value": null,
              "values": null
            }
          ]
        },
        {
          "name": "Approve phone requests (disabled)",
          "priority": 90,
          "enabled": false,
          "conditionJoin": "AND",
          "action": "AUTO_APPROVE",
          "displayOrder": 2,
          "conditions": [
            {
              "field": "channel",
              "operator": "EQUALS",
              "value": "PHONE",
              "values": null
            }
          ]
        },
        {
          "name": "Quantity over 500 (never fires)",
          "priority": 10,
          "enabled": true,
          "conditionJoin": "AND",
          "action": "MANUAL_REVIEW",
          "displayOrder": 3,
          "conditions": [
            {
              "field": "quantity",
              "operator": "GT",
              "value": "500",
              "values": null
            }
          ]
        }
      ]
    }
  },
  {
    "label": "Mapping coverage (one rule per action)",
    "ruleSet": {
      "name": "Mapping coverage",
      "enabled": true,
      "rules": [
        {
          "name": "Decline undocumented duplicates",
          "priority": 100,
          "enabled": true,
          "conditionJoin": "AND",
          "action": "AUTO_DECLINE",
          "displayOrder": 1,
          "conditions": [
            {
              "field": "flagged_duplicate",
              "operator": "IS_TRUE",
              "value": null,
              "values": null
            },
            {
              "field": "has_documentation",
              "operator": "IS_FALSE",
              "value": null,
              "values": null
            }
          ]
        },
        {
          "name": "Frequent requesters to specialist",
          "priority": 90,
          "enabled": true,
          "conditionJoin": "AND",
          "action": "ROUTE_SPECIALIST",
          "displayOrder": 2,
          "conditions": [
            {
              "field": "prior_requests_90d",
              "operator": "GTE",
              "value": "10",
              "values": null
            }
          ]
        },
        {
          "name": "Auto-approve small documented platinum",
          "priority": 80,
          "enabled": true,
          "conditionJoin": "AND",
          "action": "AUTO_APPROVE",
          "displayOrder": 3,
          "conditions": [
            {
              "field": "account_tier",
              "operator": "EQUALS",
              "value": "PLATINUM",
              "values": null
            },
            {
              "field": "has_documentation",
              "operator": "IS_TRUE",
              "value": null,
              "values": null
            },
            {
              "field": "declared_value",
              "operator": "LT",
              "value": "200",
              "values": null
            },
            {
              "field": "flagged_duplicate",
              "operator": "IS_FALSE",
              "value": null,
              "values": null
            }
          ]
        },
        {
          "name": "Documented bronze to manual review",
          "priority": 70,
          "enabled": true,
          "conditionJoin": "AND",
          "action": "MANUAL_REVIEW",
          "displayOrder": 4,
          "conditions": [
            {
              "field": "account_tier",
              "operator": "EQUALS",
              "value": "BRONZE",
              "values": null
            },
            {
              "field": "has_documentation",
              "operator": "IS_TRUE",
              "value": null,
              "values": null
            },
            {
              "field": "flagged_duplicate",
              "operator": "IS_FALSE",
              "value": null,
              "values": null
            }
          ]
        }
      ]
    }
  }
];

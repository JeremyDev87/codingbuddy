---
name: User Story
about: Define the value provided to users by the product.
title: ''
labels: 'user story'
---

## User story

- e.g., As a user, I want to be able to sell my held stocks.

## Acceptance criteria

Feature: User trades stocks

- Scenario: User requests to sell stocks.

```Gherkin
    Given User A holds 100 shares of Stock A
      And User B holds 150 shares of Stock B
      And the current time is before the trading deadline

    When User requests to sell 20 shares of MSFT

    Then User A holds 80 shares of Stock A
      And User B holds 150 shares of Stock B
      And User A's order to sell 20 shares is executed

```

## Sprint Ready Checklist

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5

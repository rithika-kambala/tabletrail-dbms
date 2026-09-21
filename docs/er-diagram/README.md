# TableTrail ER diagram

GitHub renders this Mermaid diagram. Primary and foreign keys are detailed in [database-design.md](../architecture/database-design.md); the executable schema is [schema.sql](../../database/schema.sql).

```mermaid
erDiagram
    branches ||--o{ employees : assigns
    branches ||--o{ orders : receives
    customers ||--o{ orders : places
    employees ||--o{ orders : records
    menu_categories ||--o{ menu_items : groups
    branches ||--o{ branch_menu : offers
    menu_items ||--o{ branch_menu : available_at
    menu_items ||--o{ recipes : requires
    ingredients ||--o{ recipes : used_in
    branches ||--o{ inventory : stocks
    ingredients ||--o{ inventory : stored_as
    inventory ||--o{ inventory_log : audits
    suppliers ||--o{ supplier_ingredients : quotes
    ingredients ||--o{ supplier_ingredients : supplied_as
    orders ||--|{ order_items : contains
    menu_items ||--o{ order_items : sold_as
    orders ||--o| payments : paid_by
    orders ||--o| customer_feedback : receives
    orders ||--o| order_promotions : applies
    promotions ||--o{ order_promotions : used_in
    promotions ||--o{ marketing_campaigns : advertised_by

    branches {
      int id PK
      varchar name UK
      varchar city
      boolean active
    }
    customers {
      int id PK
      varchar email UK
      varchar name
    }
    employees {
      int id PK
      int branch_id FK "nullable for admin"
      varchar email UK
      varchar password_hash
      enum role
    }
    menu_items {
      int id PK
      int category_id FK
      varchar name UK
      decimal price
    }
    recipes {
      int menu_item_id PK,FK
      int ingredient_id PK,FK
      decimal quantity
    }
    inventory {
      int branch_id PK,FK
      int ingredient_id PK,FK
      decimal quantity
      decimal threshold
    }
    orders {
      int id PK
      int branch_id FK
      int customer_id FK
      int employee_id FK
      enum status
    }
    order_items {
      int order_id PK,FK
      int menu_item_id PK,FK
      int quantity
      decimal unit_price
    }
    payments {
      int id PK
      int order_id FK,UK
      decimal amount
      enum method
    }
    order_promotions {
      int order_id PK,FK
      int promotion_id FK
      decimal discount_percent
    }
    customer_feedback {
      int order_id PK,FK
      int rating
      varchar comment
    }
```

Employee branch assignment is optional for admins, mandatory for managers/staff. The diagram shows the common assigned-employee case. Every API-created order contains at least one item; SQL foreign keys alone cannot enforce that minimum cardinality, so API validation and checkout enforce it.

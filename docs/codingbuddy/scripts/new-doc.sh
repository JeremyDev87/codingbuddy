#!/bin/bash
#
# Codingbuddy Session Documentation Generator
#
# Usage:
#   ./new-doc.sh <type> <slug> [ticket-type] [--lang <code>]
#
# Examples:
#   ./new-doc.sh plan my-feature
#   ./new-doc.sh act my-feature
#   ./new-doc.sh eval my-feature
#   ./new-doc.sh ticket my-feature FEAT
#   ./new-doc.sh ticket my-bug BUG
#   ./new-doc.sh plan my-feature --lang en
#
# i18n: Templates use {{key}} placeholders replaced by locales/*.json

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_DIR="$(dirname "$SCRIPT_DIR")"
TEMPLATES_DIR="$DOCS_DIR/.templates"
LOCALES_DIR="$TEMPLATES_DIR/locales"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current timestamp
TIMESTAMP=$(date +"%Y-%m-%d-%H%M")
DATE_DISPLAY=$(date +"%Y-%m-%d %H:%M")

# Find project root by looking for codingbuddy.config.js
find_project_root() {
    local dir="$DOCS_DIR"
    while [[ "$dir" != "/" ]]; do
        if [[ -f "$dir/codingbuddy.config.js" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    echo ""
}

# Get language from codingbuddy.config.js
get_language() {
    local project_root=$(find_project_root)
    local config_file="$project_root/codingbuddy.config.js"

    if [[ -f "$config_file" ]]; then
        local lang=$(grep -E "^\s*language:" "$config_file" | sed "s/.*['\"]\\([^'\"]*\\)['\"].*/\\1/" | head -1)
        if [[ -n "$lang" ]]; then
            echo "$lang"
            return 0
        fi
    fi
    echo "en"
}

# Get locale file path with English fallback
# Usage: get_locale_file
get_locale_file() {
    local locale_file="$LOCALES_DIR/${LANG}.json"
    if [[ ! -f "$locale_file" ]]; then
        locale_file="$LOCALES_DIR/en.json"
    fi
    echo "$locale_file"
}

# Validate content for missing translation keys
# Usage: validate_locale "content"
# Returns: warnings for any {{key}} patterns still present
validate_locale() {
    local content="$1"
    local missing_keys=$(echo "$content" | grep -oE '\{\{[a-z_]+\}\}' | sort -u)

    if [[ -n "$missing_keys" ]]; then
        echo -e "${YELLOW}Warning: Missing translations found:${NC}"
        echo "$missing_keys" | while read -r key; do
            echo "  - $key"
        done
    fi
}

# Get translation value from JSON file
# Usage: get_i18n "key"
get_i18n() {
    local key=$1
    local locale_file=$(get_locale_file)

    # Extract value for key from JSON (simple grep/sed approach, no jq needed)
    local value=$(grep "\"$key\":" "$locale_file" | sed 's/.*: *"\([^"]*\)".*/\1/' | head -1)

    if [[ -n "$value" ]]; then
        echo "$value"
    else
        # Return key itself if not found (for debugging)
        echo "{{$key}}"
    fi
}

# Apply i18n translations to template content
# Replaces all {{key}} patterns with translations
apply_i18n() {
    local content="$1"
    local locale_file=$(get_locale_file)

    # Extract all keys from locale file and replace in content
    while IFS= read -r line; do
        # Parse each "key": "value" line
        if [[ "$line" =~ \"([^\"]+)\":\ *\"([^\"]+)\" ]]; then
            local key="${BASH_REMATCH[1]}"
            local value="${BASH_REMATCH[2]}"
            # Escape special characters for sed replacement string
            # Order matters: escape backslash first, then & and /
            value=$(echo "$value" | sed -e 's/\\/\\\\/g' -e 's/[&/]/\\&/g')
            content=$(echo "$content" | sed "s/{{$key}}/$value/g")
        fi
    done < "$locale_file"

    echo "$content"
}

# Get language (can be overridden by --lang argument)
LANG=$(get_language)
LANG_OVERRIDE=""

# Parse --lang argument from any position
for i in "$@"; do
    if [[ "$i" == "--lang" ]]; then
        LANG_OVERRIDE="next"
    elif [[ "$LANG_OVERRIDE" == "next" ]]; then
        LANG="$i"
        LANG_OVERRIDE="done"
    fi
done

# Check if locale file exists
if [[ ! -f "$LOCALES_DIR/${LANG}.json" ]]; then
    echo -e "${YELLOW}Warning: Locale '${LANG}' not found, falling back to English${NC}"
    LANG="en"
fi

usage() {
    echo "Usage: $0 <type> <slug> [ticket-type] [--lang <code>]"
    echo ""
    echo "Types:"
    echo "  plan    - Create a PLAN document"
    echo "  act     - Create an ACT document"
    echo "  eval    - Create an EVAL document"
    echo "  ticket  - Create a ticket (requires ticket-type: FEAT, BUG, REFACTOR)"
    echo ""
    echo "Options:"
    echo "  --lang <code>  Override language (e.g., en, ko, ja)"
    echo ""
    echo "Examples:"
    echo "  $0 plan user-authentication"
    echo "  $0 act user-authentication"
    echo "  $0 eval user-authentication"
    echo "  $0 ticket user-auth FEAT"
    echo "  $0 ticket fix-login-bug BUG"
    echo "  $0 plan my-feature --lang en"
    echo ""
    echo "Language: $LANG (from codingbuddy.config.js or --lang override)"
    echo "Locales available: $(ls "$LOCALES_DIR" 2>/dev/null | sed 's/.json//g' | tr '\n' ' ')"
    exit 1
}

get_next_ticket_number() {
    local ticket_type=$1
    local tickets_dir="$DOCS_DIR/tickets"

    local max_num=0
    for file in "$tickets_dir"/${ticket_type}-*; do
        if [[ -f "$file" ]]; then
            num=$(basename "$file" | sed -n "s/${ticket_type}-\([0-9]*\)-.*/\1/p")
            if [[ -n "$num" ]] && [[ $num -gt $max_num ]]; then
                max_num=$num
            fi
        fi
    done

    printf "%03d" $((max_num + 1))
}

create_document() {
    local doc_type=$1
    local slug=$2
    local template_file=""
    local output_dir=""
    local output_file=""

    case $doc_type in
        plan)
            template_file="$TEMPLATES_DIR/PLAN.md"
            output_dir="$DOCS_DIR/plan"
            ;;
        act)
            template_file="$TEMPLATES_DIR/ACT.md"
            output_dir="$DOCS_DIR/act"
            ;;
        eval)
            template_file="$TEMPLATES_DIR/EVAL.md"
            output_dir="$DOCS_DIR/eval"
            ;;
        *)
            echo -e "${RED}Error: Unknown document type '$doc_type'${NC}"
            usage
            ;;
    esac

    output_file="$output_dir/${slug}-${TIMESTAMP}.md"

    if [[ ! -f "$template_file" ]]; then
        echo -e "${RED}Error: Template not found: $template_file${NC}"
        exit 1
    fi

    mkdir -p "$output_dir"

    # Read template, apply i18n, then replace other placeholders
    local content=$(cat "$template_file")
    content=$(apply_i18n "$content")

    # Replace standard placeholders
    content=$(echo "$content" | sed -e "s/{title}/${slug}/g" \
        -e "s/YYYY-MM-DD HH:mm/${DATE_DISPLAY}/g" \
        -e "s/{user}/User/g" \
        -e "s/{phase-name}/Phase/g" \
        -e "s/{feature-1}/Feature 1/g" \
        -e "s/{feature-2}/Feature 2/g")

    # Warn about missing translations
    validate_locale "$content"

    echo "$content" > "$output_file"
    echo -e "${GREEN}Created:${NC} $output_file"
}

create_ticket() {
    local slug=$1
    local ticket_type=$2

    if [[ -z "$ticket_type" ]]; then
        echo -e "${RED}Error: Ticket type required (FEAT, BUG, REFACTOR)${NC}"
        usage
    fi

    case $ticket_type in
        FEAT|BUG|REFACTOR) ;;
        *)
            echo -e "${RED}Error: Invalid ticket type '$ticket_type'. Use FEAT, BUG, or REFACTOR${NC}"
            exit 1
            ;;
    esac

    local ticket_num=$(get_next_ticket_number "$ticket_type")
    local output_dir="$DOCS_DIR/tickets"
    local output_file="$output_dir/${ticket_type}-${ticket_num}-${slug}-${TIMESTAMP}.md"

    mkdir -p "$output_dir"

    # Get translations
    local t_created=$(get_i18n "created")
    local t_status=$(get_i18n "ticket_status")
    local t_related=$(get_i18n "related_docs")
    local t_type=$(get_i18n "type")
    local t_link=$(get_i18n "link")
    local t_summary=$(get_i18n "summary")
    local t_item=$(get_i18n "item")
    local t_content=$(get_i18n "content")
    local t_ticket_type=$(get_i18n "ticket_type")
    local t_severity=$(get_i18n "ticket_severity")
    local t_scope=$(get_i18n "ticket_scope")
    local t_problem=$(get_i18n "ticket_problem")
    local t_problem_hint=$(get_i18n "ticket_problem_hint")
    local t_solution=$(get_i18n "ticket_solution")
    local t_solution_hint=$(get_i18n "ticket_solution_hint")
    local t_benefits=$(get_i18n "ticket_benefits")
    local t_benefits_hint=$(get_i18n "ticket_benefits_hint")

    cat > "$output_file" << EOF
# ${ticket_type}-${ticket_num}: ${slug}

**${t_created}**: ${DATE_DISPLAY}
**${t_status}**: Draft

---

## ${t_related}

| ${t_type} | ${t_link} |
|----------|----------|
| PLAN | TBD |
| ACT | TBD |
| EVAL | TBD |

---

## ${t_summary}

| ${t_item} | ${t_content} |
|----------|--------------|
| **${t_ticket_type}** | ${ticket_type} |
| **${t_severity}** | Medium |
| **${t_scope}** | TBD |

---

## ${t_problem}

<!-- ${t_problem_hint} -->

---

## ${t_solution}

<!-- ${t_solution_hint} -->

---

## ${t_benefits}

<!-- ${t_benefits_hint} -->
EOF

    echo -e "${GREEN}Created:${NC} $output_file"
    echo -e "${YELLOW}Ticket ID:${NC} ${ticket_type}-${ticket_num}"
}

# Main
# Filter out --lang and its value from arguments
ARGS=()
SKIP_NEXT=false
for arg in "$@"; do
    if [[ "$SKIP_NEXT" == true ]]; then
        SKIP_NEXT=false
        continue
    fi
    if [[ "$arg" == "--lang" ]]; then
        SKIP_NEXT=true
        continue
    fi
    ARGS+=("$arg")
done

# Handle --help/-h flag
if [[ ${#ARGS[@]} -eq 0 ]] || [[ "${ARGS[0]}" == "--help" ]] || [[ "${ARGS[0]}" == "-h" ]]; then
    usage
fi

if [[ ${#ARGS[@]} -lt 2 ]]; then
    usage
fi

DOC_TYPE=${ARGS[0]}
SLUG=${ARGS[1]}
TICKET_TYPE=${ARGS[2]:-""}

case $DOC_TYPE in
    plan|act|eval)
        create_document "$DOC_TYPE" "$SLUG"
        ;;
    ticket)
        create_ticket "$SLUG" "$TICKET_TYPE"
        ;;
    *)
        echo -e "${RED}Error: Unknown type '$DOC_TYPE'${NC}"
        usage
        ;;
esac

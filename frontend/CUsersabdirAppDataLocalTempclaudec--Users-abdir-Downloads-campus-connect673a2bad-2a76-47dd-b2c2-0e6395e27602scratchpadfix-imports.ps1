# Fix discussions import errors
$replacements = @(
    # Hooks from services
    @{
        pattern = '@/components/discussions/../hooks/use-discussion-permissions'
        replacement = '@/lib/discussions/services/use-discussion-permissions'
        desc = 'use-discussion-permissions hook'
    },
    @{
        pattern = '@/components/discussions/../hooks/use-channel-messages'
        replacement = '@/lib/discussions/services/use-channel-messages'
        desc = 'use-channel-messages hook'
    },
    @{
        pattern = '@/components/discussions/../hooks/use-thread-messages'
        replacement = '@/lib/discussions/services/use-thread-messages'
        desc = 'use-thread-messages hook'
    },
    @{
        pattern = '@/components/discussions/../hooks/use-discussion-room'
        replacement = '@/lib/discussions/services/use-discussion-room'
        desc = 'use-discussion-room hook'
    },
    # Services from discussions/services
    @{
        pattern = '@/components/discussions/../decode-web-e2e-ciphertext'
        replacement = '@/lib/discussions/services/decode-web-e2e-ciphertext'
        desc = 'decode-web-e2e-ciphertext service'
    },
    @{
        pattern = '@/components/discussions/../discussion-upload'
        replacement = '@/lib/discussions/services/discussion-upload'
        desc = 'discussion-upload service'
    },
    @{
        pattern = '@/components/discussions/../discussion-qa'
        replacement = '@/lib/discussions/services/discussion-qa'
        desc = 'discussion-qa service'
    },
    @{
        pattern = '@/components/discussions/../discussion-message-reactions'
        replacement = '@/lib/discussions/services/discussion-message-reactions'
        desc = 'discussion-message-reactions service'
    },
    @{
        pattern = '@/components/discussions/../discussion-message-markdown'
        replacement = '@/lib/discussions/services/discussion-message-markdown'
        desc = 'discussion-message-markdown service'
    },
    @{
        pattern = '@/components/discussions/../discussion-attachment-cards'
        replacement = '@/lib/discussions/services/discussion-attachment-cards'
        desc = 'discussion-attachment-cards service'
    },
    # Components within discussions
    @{
        pattern = '@/components/discussions/../message-reply-quote'
        replacement = '@/components/discussions/message-reply-quote'
        desc = 'message-reply-quote component'
    },
    @{
        pattern = '@/components/discussions/../composer/message-composer'
        replacement = '@/components/discussions/composer/message-composer'
        desc = 'message-composer component'
    },
    @{
        pattern = '@/components/discussions/../threads/thread-panel'
        replacement = '@/components/discussions/threads/thread-panel'
        desc = 'thread-panel component'
    },
    @{
        pattern = '@/components/discussions/../details/details-panel'
        replacement = '@/components/discussions/details/details-panel'
        desc = 'details-panel component'
    },
    @{
        pattern = '@/components/discussions/../channel/typing-indicator'
        replacement = '@/components/discussions/channel/typing-indicator'
        desc = 'typing-indicator component'
    },
    @{
        pattern = '@/components/discussions/../channel/day-separator'
        replacement = '@/components/discussions/channel/day-separator'
        desc = 'day-separator component'
    },
    # Two-level up replacements
    @{
        pattern = '@/components/discussions/../../utils/avatar-color'
        replacement = '@/lib/discussions/services/avatar-color'
        desc = 'avatar-color utility'
    },
    @{
        pattern = '@/components/discussions/../../utils/format-channel-pin-preview'
        replacement = '@/lib/discussions/services/format-channel-pin-preview'
        desc = 'format-channel-pin-preview utility'
    },
    @{
        pattern = '@/components/discussions/../../discussion-upload'
        replacement = '@/lib/discussions/services/discussion-upload'
        desc = 'discussion-upload service (2-level)'
    },
    @{
        pattern = '@/components/discussions/../../discussion-message-reactions'
        replacement = '@/lib/discussions/services/discussion-message-reactions'
        desc = 'discussion-message-reactions service (2-level)'
    },
    @{
        pattern = '@/components/discussions/../../discussion-message-markdown'
        replacement = '@/lib/discussions/services/discussion-message-markdown'
        desc = 'discussion-message-markdown service (2-level)'
    },
    @{
        pattern = '@/components/discussions/../../discussion-attachment-cards'
        replacement = '@/lib/discussions/services/discussion-attachment-cards'
        desc = 'discussion-attachment-cards service (2-level)'
    },
    @{
        pattern = '@/components/discussions/../../details/presence-dot'
        replacement = '@/components/discussions/details/presence-dot'
        desc = 'presence-dot component'
    },
    # API queries and types
    @{
        pattern = '@/components/discussions/../../../api/queries'
        replacement = '@/lib/discussions/queries'
        desc = 'api/queries'
    },
    @{
        pattern = '@/components/discussions/../../../api/types'
        replacement = '@/lib/discussions/queries'
        desc = 'api/types'
    },
    @{
        pattern = '@/components/discussions/../../../hooks/use-discussion-permissions'
        replacement = '@/lib/discussions/services/use-discussion-permissions'
        desc = 'use-discussion-permissions (3-level)'
    }
)

$files = Get-ChildItem -Path "src/components/discussions" -File -Recurse -Include "*.ts", "*.tsx"
$totalFixed = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    foreach ($replacement in $replacements) {
        $pattern = [regex]::Escape($replacement.pattern)
        if ($content -match $pattern) {
            $content = $content -replace $pattern, $replacement.replacement
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "Fixed: $($file.FullName)"
        $totalFixed++
    }
}

Write-Host "`nTotal files fixed: $totalFixed"

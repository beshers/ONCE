using System;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Threading;

namespace OCNE.Desktop;

public partial class MainWindow : Window
{
    private static readonly Uri HomeUri = new("https://ocne.onrender.com/");
    private readonly DispatcherTimer _statusTimer;

    public MainWindow()
    {
        InitializeComponent();
        Browser.Source = HomeUri;

        _statusTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(2.5) };
        _statusTimer.Tick += (_, _) =>
        {
            StatusPanel.IsVisible = false;
            _statusTimer.Stop();
        };
    }

    private void GoButton_Click(object? sender, RoutedEventArgs e)
    {
        Navigate(AddressBox.Text);
    }

    private void ReloadButton_Click(object? sender, RoutedEventArgs e)
    {
        var current = Browser.Source;
        Browser.Source = new Uri("about:blank");
        Browser.Source = current ?? HomeUri;
        ShowStatus("Reloading OCNE...");
    }

    private void HomeButton_Click(object? sender, RoutedEventArgs e)
    {
        Browser.Source = HomeUri;
        AddressBox.Text = HomeUri.ToString();
        ShowStatus("Opening OCNE home.");
    }

    private void Navigate(string? rawUrl)
    {
        var url = string.IsNullOrWhiteSpace(rawUrl) ? HomeUri.ToString() : rawUrl.Trim();
        if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            url = $"https://{url}";
        }

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            ShowStatus("Please enter a valid website URL.");
            return;
        }

        Browser.Source = uri;
        AddressBox.Text = uri.ToString();
        ShowStatus("Opening website...");
    }

    private void ShowStatus(string message)
    {
        StatusText.Text = message;
        StatusPanel.IsVisible = true;
        _statusTimer.Stop();
        _statusTimer.Start();
    }
}

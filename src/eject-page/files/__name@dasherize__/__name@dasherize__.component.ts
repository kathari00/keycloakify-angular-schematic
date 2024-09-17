
import {Component, TemplateRef, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import { KcClassPipe } from '../../common/pipes/classname.pipe';
import { SanitizeHtmlPipe } from "../../common/pipes/sanitize-html.pipe";
import { I18nService } from '../../common/services/i18n.service';
import { KcContext } from 'keycloakify/login/KcContext';


@Component({
  selector: 'kc-<%= dasherize(name) %>',
  templateUrl: './<%= dasherize(name) %>.component.html',
  styleUrls: ['./<%= dasherize(name) %>.component.css'],
  standalone: true,
  imports: [KcClassPipe, CommonModule, SanitizeHtmlPipe]
})
export class <%= classify(name) %>Component {

  //you need to define the page type like KcContext.Login
  kcContext: KcContext = window.kcContext;

  @ViewChild('headerNode') headerNode?: TemplateRef<any>;
  @ViewChild('infoNode') infoNode?: TemplateRef<any>;
  @ViewChild('socialProvidersNode') socialProvidersNode?: TemplateRef<any>;
  displayInfo: boolean = false;
  displayMessage: boolean = false;

  constructor(public i18nService: I18nService){}
}